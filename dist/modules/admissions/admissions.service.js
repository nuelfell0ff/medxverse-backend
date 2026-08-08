import { Types } from 'mongoose';
import { InpatientAdmissionModel } from './admissions.model.js';
import { AdmissionStatus, } from './admissions.types.js';
export class AdmissionsService {
    async admitPatient(input) {
        const existingOccupancy = await InpatientAdmissionModel.findOne({
            hospitalId: input.hospitalId,
            wardId: input.wardId,
            bedNumber: input.bedNumber,
            status: AdmissionStatus.ADMITTED,
        });
        if (existingOccupancy) {
            throw new Error(`Bed ${input.bedNumber} in ward ${input.wardId} is currently occupied.`);
        }
        return InpatientAdmissionModel.create({
            ...input,
            status: AdmissionStatus.ADMITTED,
            admittedAt: new Date(),
        });
    }
    async getAdmissions(hospitalId, query) {
        const page = Math.max(1, query.page || 1);
        const limit = Math.min(50, Math.max(1, query.limit || 20));
        const skip = (page - 1) * limit;
        const filter = { hospitalId };
        if (query.status)
            filter.status = query.status;
        if (query.wardId)
            filter.wardId = query.wardId;
        if (query.patientId)
            filter.patientId = query.patientId;
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
    async getAdmissionById(admissionId, hospitalId) {
        return InpatientAdmissionModel.findOne({ _id: admissionId, hospitalId })
            .populate('patientId', 'firstName lastName mrn gender dateOfBirth')
            .populate('admittingDoctorId', 'firstName lastName role')
            .exec();
    }
    async transferBed(admissionId, hospitalId, input) {
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
        const transferEntry = {
            fromWardId: currentAdmission.wardId,
            fromBedNumber: currentAdmission.bedNumber,
            toWardId: input.toWardId,
            toBedNumber: input.toBedNumber,
            transferredAt: new Date(),
            transferredBy: new Types.ObjectId(input.transferredBy),
            reason: input.reason,
        };
        return InpatientAdmissionModel.findOneAndUpdate({ _id: admissionId, hospitalId }, {
            $set: {
                wardId: input.toWardId,
                bedNumber: input.toBedNumber,
            },
            $push: { transferHistory: transferEntry },
        }, { new: true }).exec();
    }
    async dischargePatient(admissionId, hospitalId, input) {
        return InpatientAdmissionModel.findOneAndUpdate({ _id: admissionId, hospitalId, status: AdmissionStatus.ADMITTED }, {
            $set: {
                status: AdmissionStatus.DISCHARGED,
                dischargedAt: new Date(),
                dischargeSummary: input.dischargeSummary,
            },
        }, { new: true }).exec();
    }
}
export const admissionsService = new AdmissionsService();
