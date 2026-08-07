import { Types } from 'mongoose';
import { MchRecordModel } from './mch.model.js';
import {
  CreateMchRecordInput,
  GetMchRecordsQuery,
  IMchRecordDocument,
  AddAncVisitInput,
  RecordDeliveryInput,
  AddImmunizationInput,
  PregnancyStatus,
} from './mch.types.js';

export class MchService {
  public async createRecord(input: CreateMchRecordInput): Promise<IMchRecordDocument> {
    return MchRecordModel.create({
      ...input,
      pregnancyStatus: input.careType === 'ANTENATAL' ? PregnancyStatus.ACTIVE : undefined,
      isActive: true,
    });
  }

  public async getRecords(
    hospitalId: string,
    query: GetMchRecordsQuery
  ): Promise<{ records: IMchRecordDocument[]; total: number; page: number; totalPages: number }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { hospitalId, isActive: true };

    if (query.careType) filter.careType = query.careType;
    if (query.patientId) filter.patientId = query.patientId;
    if (query.pregnancyStatus) filter.pregnancyStatus = query.pregnancyStatus;

    const [records, total] = await Promise.all([
      MchRecordModel.find(filter)
        .populate('patientId', 'firstName lastName mrn dateOfBirth gender phone')
        .populate('ancVisits.attendingStaffId', 'firstName lastName role')
        .populate('pncVisits.attendingStaffId', 'firstName lastName role')
        .populate('immunizations.administeredBy', 'firstName lastName role')
        .populate('deliveryRecord.deliveredBy', 'firstName lastName role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      MchRecordModel.countDocuments(filter),
    ]);

    return {
      records,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  public async getRecordById(recordId: string, hospitalId: string): Promise<IMchRecordDocument | null> {
    return MchRecordModel.findOne({ _id: recordId, hospitalId, isActive: true })
      .populate('patientId', 'firstName lastName mrn dateOfBirth gender phone')
      .populate('ancVisits.attendingStaffId', 'firstName lastName role')
      .populate('pncVisits.attendingStaffId', 'firstName lastName role')
      .populate('immunizations.administeredBy', 'firstName lastName role')
      .populate('deliveryRecord.deliveredBy', 'firstName lastName role')
      .exec();
  }

  public async addAncVisit(
    recordId: string,
    hospitalId: string,
    input: AddAncVisitInput
  ): Promise<IMchRecordDocument | null> {
    const ancEntry = {
      ...input,
      visitDate: new Date(),
      attendingStaffId: new Types.ObjectId(input.attendingStaffId),
    };

    return MchRecordModel.findOneAndUpdate(
      { _id: recordId, hospitalId, isActive: true },
      { $push: { ancVisits: ancEntry } },
      { new: true }
    ).exec();
  }

  public async recordDelivery(
    recordId: string,
    hospitalId: string,
    input: RecordDeliveryInput
  ): Promise<IMchRecordDocument | null> {
    const deliveryRecord = {
      ...input,
      deliveryDate: input.deliveryDate ? new Date(input.deliveryDate) : new Date(),
      deliveredBy: new Types.ObjectId(input.deliveredBy),
    };

    return MchRecordModel.findOneAndUpdate(
      { _id: recordId, hospitalId, isActive: true },
      {
        $set: {
          deliveryRecord,
          pregnancyStatus: PregnancyStatus.DELIVERED,
        },
      },
      { new: true }
    ).exec();
  }

  public async addImmunization(
    recordId: string,
    hospitalId: string,
    input: AddImmunizationInput
  ): Promise<IMchRecordDocument | null> {
    const immunizationEntry = {
      ...input,
      administeredAt: new Date(),
      administeredBy: new Types.ObjectId(input.administeredBy),
      nextDueDate: input.nextDueDate ? new Date(input.nextDueDate) : undefined,
    };

    return MchRecordModel.findOneAndUpdate(
      { _id: recordId, hospitalId, isActive: true },
      { $push: { immunizations: immunizationEntry } },
      { new: true }
    ).exec();
  }
}

export const mchService = new MchService();