import { Types } from 'mongoose';
import { DentalChartModel, DentalProcedureModel } from './dental.model.js';
import {
  UpsertDentalChartInput,
  CreateDentalProcedureInput,
  GetDentalProceduresQuery,
  IDentalChartDocument,
  IDentalProcedureDocument,
  UpdateProcedureStatusInput,
  ProcedureStatus,
} from './dental.types.js';

export class DentalService {
  public async upsertDentalChart(
    input: UpsertDentalChartInput
  ): Promise<IDentalChartDocument> {
    const filter = {
      hospitalId: new Types.ObjectId(input.hospitalId),
      patientId: new Types.ObjectId(input.patientId),
    };

    const update = {
      dentistId: new Types.ObjectId(input.dentistId),
      teeth: input.teeth,
      ...(input.overallPeriodontalHealth ? { overallPeriodontalHealth: input.overallPeriodontalHealth } : {}),
      ...(input.notes ? { notes: input.notes } : {}),
    };

    return DentalChartModel.findOneAndUpdate(filter, { $set: update }, { new: true, upsert: true }).exec();
  }

  public async getPatientDentalChart(
    patientId: string,
    hospitalId: string
  ): Promise<IDentalChartDocument | null> {
    return DentalChartModel.findOne({ patientId, hospitalId })
      .populate('patientId', 'firstName lastName mrn dateOfBirth gender')
      .populate('dentistId', 'firstName lastName role')
      .exec();
  }

  public async createDentalProcedure(
    input: CreateDentalProcedureInput
  ): Promise<IDentalProcedureDocument> {
    return DentalProcedureModel.create({
      ...input,
      hospitalId: new Types.ObjectId(input.hospitalId),
      patientId: new Types.ObjectId(input.patientId),
      dentistId: new Types.ObjectId(input.dentistId),
      performedAt: input.performedAt ? new Date(input.performedAt) : undefined,
    });
  }

  public async getDentalProcedures(
    hospitalId: string,
    query: GetDentalProceduresQuery
  ): Promise<{ procedures: IDentalProcedureDocument[]; total: number; page: number; totalPages: number }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { hospitalId };

    if (query.patientId) filter.patientId = query.patientId;
    if (query.dentistId) filter.dentistId = query.dentistId;
    if (query.procedureType) filter.procedureType = query.procedureType;
    if (query.status) filter.status = query.status;
    if (query.toothNumber !== undefined) filter.toothNumber = query.toothNumber;

    const [procedures, total] = await Promise.all([
      DentalProcedureModel.find(filter)
        .populate('patientId', 'firstName lastName mrn dateOfBirth gender')
        .populate('dentistId', 'firstName lastName role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      DentalProcedureModel.countDocuments(filter),
    ]);

    return {
      procedures,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  public async updateProcedureStatus(
    procedureId: string,
    hospitalId: string,
    input: UpdateProcedureStatusInput
  ): Promise<IDentalProcedureDocument | null> {
    const updateData: Record<string, unknown> = { status: input.status };

    if (input.clinicalNotes) updateData.clinicalNotes = input.clinicalNotes;
    if (input.cost !== undefined) updateData.cost = input.cost;

    if (input.status === ProcedureStatus.COMPLETED) {
      updateData.performedAt = new Date();
    }

    return DentalProcedureModel.findOneAndUpdate(
      { _id: procedureId, hospitalId },
      { $set: updateData },
      { new: true }
    ).exec();
  }
}

export const dentalService = new DentalService();