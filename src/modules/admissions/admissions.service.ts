import { Types } from 'mongoose';
import { InpatientAdmissionModel } from './admissions.model.js';
import {
  CreateAdmissionInput,
  GetAdmissionsQuery,
  IInpatientAdmissionDocument,
  AdmissionStatus,
  TransferBedInput,
  DischargePatientInput,
} from './admissions.types.js';
import { publishEhrResource } from '../patient/ehr.publisher.js';
import { bedWardService } from '../bed-ward/bed-ward.service.js';
import { BedStatus } from '../bed-ward/bed-ward.types.js';

export class AdmissionsService {
  public async admitPatient(input: CreateAdmissionInput): Promise<IInpatientAdmissionDocument> {
    const existingOccupancy = await InpatientAdmissionModel.findOne({
      hospitalId: input.hospitalId,
      wardId: input.wardId,
      bedNumber: input.bedNumber,
      status: AdmissionStatus.ADMITTED,
    });

    if (existingOccupancy) {
      throw new Error(`Bed ${input.bedNumber} in ward ${input.wardId} is currently occupied.`);
    }

    const smartBed = await bedWardService.findBedByWardAndNumber(
      input.wardId,
      input.bedNumber,
      input.hospitalId,
    );

    if (smartBed) {
      if (smartBed.status !== BedStatus.AVAILABLE) {
        throw new Error(`Bed ${input.bedNumber} in ward ${input.wardId} is not available. Current status: ${smartBed.status}.`);
      }
      await bedWardService.transitionBed(String(smartBed._id), input.hospitalId, {
        status: BedStatus.OCCUPIED,
        actorId: input.admittingDoctorId,
        patientId: input.patientId,
        reason: 'Inpatient admission assigned to bed.',
        expectedVersion: smartBed.version,
      });
    }

    let admission;
    try {
      admission = await InpatientAdmissionModel.create({
        ...input,
        status: AdmissionStatus.ADMITTED,
        admittedAt: new Date(),
      });
    } catch (error) {
      if (smartBed) {
        try {
          await bedWardService.transitionBed(String(smartBed._id), input.hospitalId, {
            status: BedStatus.CLEANING,
            actorId: input.admittingDoctorId,
            patientId: input.patientId,
            reason: 'Admission creation failed; bed sent to cleaning for reconciliation.',
          });
        } catch (cleanupError) {
          console.error('[Admissions] Bed reconciliation failed after admission creation error:', cleanupError);
        }
      }
      throw error;
    }

    await publishEhrResource({
      hospitalId: input.hospitalId,
      patientId: input.patientId,
      actorId: input.admittingDoctorId,
      role: 'ADMISSIONS',
      resourceType: 'Encounter',
      resourceId: admission._id.toString(),
      status: admission.status,
      department: 'Inpatient',
      resource: {
        resourceType: 'Encounter',
        id: admission._id.toString(),
        status: admission.status,
        class: 'IMP',
        type: { coding: [{ system: 'LOCAL', code: 'INPATIENT', display: 'Inpatient admission' }] },
        period: { start: admission.admittedAt },
        reason: admission.admissionReason,
        location: { wardId: admission.wardId, bedNumber: admission.bedNumber, bedType: admission.bedType },
        sourceAdmissionId: admission._id.toString(),
      },
      reason: 'Inpatient admission published to Unified EHR.',
    });

    return admission;
  }

  public async getAdmissions(
    hospitalId: string,
    query: GetAdmissionsQuery
  ): Promise<{ admissions: IInpatientAdmissionDocument[]; total: number; page: number; totalPages: number }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { hospitalId };

    if (query.status) filter.status = query.status;
    if (query.wardId) filter.wardId = query.wardId;
    if (query.patientId) filter.patientId = query.patientId;

    const [admissions, total] = await Promise.all([
      InpatientAdmissionModel.find(filter)
        .populate('patientId', 'firstName lastName mrn gender dateOfBirth')
        .populate('admittingDoctorId', 'firstName lastName role')
        .sort({ admittedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      InpatientAdmissionModel.countDocuments(filter),
    ]);

    return {
      admissions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  public async getAdmissionById(
    admissionId: string,
    hospitalId: string
  ): Promise<IInpatientAdmissionDocument | null> {
    return InpatientAdmissionModel.findOne({ _id: admissionId, hospitalId })
      .populate('patientId', 'firstName lastName mrn gender dateOfBirth')
      .populate('admittingDoctorId', 'firstName lastName role')
      .exec();
  }

  public async transferBed(
    admissionId: string,
    hospitalId: string,
    input: TransferBedInput
  ): Promise<IInpatientAdmissionDocument | null> {
    const currentAdmission = await InpatientAdmissionModel.findOne({
      _id: admissionId,
      hospitalId,
      status: AdmissionStatus.ADMITTED,
    });

    if (!currentAdmission) {
      throw new Error('Active inpatient admission record not found.');
    }

    const bedOccupied = await InpatientAdmissionModel.findOne({
      hospitalId,
      wardId: input.toWardId,
      bedNumber: input.toBedNumber,
      status: AdmissionStatus.ADMITTED,
    });

    if (bedOccupied) {
      throw new Error(`Destination Bed ${input.toBedNumber} in ward ${input.toWardId} is already occupied.`);
    }

    const destinationSmartBed = await bedWardService.findBedByWardAndNumber(
      input.toWardId,
      input.toBedNumber,
      hospitalId,
    );

    const sourceSmartBed = await bedWardService.findBedByWardAndNumber(
      currentAdmission.wardId,
      currentAdmission.bedNumber,
      hospitalId,
    );

    if (destinationSmartBed) {
      if (destinationSmartBed.status !== BedStatus.AVAILABLE) {
        throw new Error(`Destination bed ${input.toBedNumber} is not available in the smart bed board.`);
      }

      await bedWardService.transitionBed(String(destinationSmartBed._id), hospitalId, {
        status: BedStatus.OCCUPIED,
        actorId: input.transferredBy,
        patientId: currentAdmission.patientId.toString(),
        reason: input.reason || 'Inpatient transfer destination assigned.',
        expectedVersion: destinationSmartBed.version,
      });
    }

    const transferEntry = {
      fromWardId: currentAdmission.wardId,
      fromBedNumber: currentAdmission.bedNumber,
      toWardId: input.toWardId,
      toBedNumber: input.toBedNumber,
      transferredAt: new Date(),
      transferredBy: new Types.ObjectId(input.transferredBy),
      reason: input.reason,
    };

    const updated = await InpatientAdmissionModel.findOneAndUpdate(
      { _id: admissionId, hospitalId },
      {
        $set: {
          wardId: input.toWardId,
          bedNumber: input.toBedNumber,
        },
        $push: { transferHistory: transferEntry },
      },
      { new: true }
    ).exec();

    if (updated && sourceSmartBed && sourceSmartBed.status === BedStatus.OCCUPIED) {
      try {
        await bedWardService.transitionBed(String(sourceSmartBed._id), hospitalId, {
          status: BedStatus.CLEANING,
          actorId: input.transferredBy,
          patientId: currentAdmission.patientId.toString(),
          reason: input.reason || 'Patient transferred; source bed requires cleaning.',
          expectedVersion: sourceSmartBed.version,
        });
      } catch (error) {
        console.error('[Admissions] Source bed cleaning trigger failed after transfer:', error);
      }
    }

    return updated;
  }

  public async dischargePatient(
    admissionId: string,
    hospitalId: string,
    input: DischargePatientInput
  ): Promise<IInpatientAdmissionDocument | null> {
    const updated = await InpatientAdmissionModel.findOneAndUpdate(
      { _id: admissionId, hospitalId, status: AdmissionStatus.ADMITTED },
      {
        $set: {
          status: AdmissionStatus.DISCHARGED,
          dischargedAt: new Date(),
          dischargeSummary: input.dischargeSummary,
        },
      },
      { new: true }
    ).exec();

    if (updated) {
      const smartBed = await bedWardService.findBedByWardAndNumber(
        updated.wardId,
        updated.bedNumber,
        hospitalId,
      );

      if (smartBed && smartBed.status === BedStatus.OCCUPIED) {
        try {
          await bedWardService.transitionBed(String(smartBed._id), hospitalId, {
            status: BedStatus.CLEANING,
            actorId: updated.admittingDoctorId.toString(),
            patientId: updated.patientId.toString(),
            reason: 'Inpatient discharge completed; housekeeping cleaning required.',
            expectedVersion: smartBed.version,
          });
        } catch (error) {
          console.error('[Admissions] Unable to trigger bed cleaning after discharge:', error);
        }
      }

      await publishEhrResource({
        hospitalId,
        patientId: updated.patientId.toString(),
        actorId: updated.admittingDoctorId.toString(),
        role: 'ADMISSIONS',
        resourceType: 'Encounter',
        resourceId: updated._id.toString(),
        status: updated.status,
        department: 'Inpatient',
        resource: {
          resourceType: 'Encounter',
          id: updated._id.toString(),
          status: updated.status,
          class: 'IMP',
          period: { start: updated.admittedAt, end: updated.dischargedAt },
          reason: updated.admissionReason,
          dischargeSummary: updated.dischargeSummary,
          location: { wardId: updated.wardId, bedNumber: updated.bedNumber, bedType: updated.bedType },
        },
        reason: 'Inpatient discharge published to Unified EHR.',
      });
    }

    return updated;
  }
}

export const admissionsService = new AdmissionsService();