import { RadiologyOrderModel } from './radiology.model.js';
import {
  CreateRadiologyOrderInput,
  GetRadiologyOrdersQuery,
  IRadiologyOrderDocument,
  RadiologyOrderStatus,
  UpdatePacsMetadataInput,
  CompleteRadiologyReportInput,
} from './radiology.types.js';

export class RadiologyService {
  public async createOrder(input: CreateRadiologyOrderInput): Promise<IRadiologyOrderDocument> {
    return RadiologyOrderModel.create({
      ...input,
      status: RadiologyOrderStatus.REQUESTED,
    });
  }

  public async getOrders(
    hospitalId: string,
    query: GetRadiologyOrdersQuery
  ): Promise<{ orders: IRadiologyOrderDocument[]; total: number; page: number; totalPages: number }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { hospitalId };

    if (query.status) filter.status = query.status;
    if (query.modality) filter.modality = query.modality;
    if (query.patientId) filter.patientId = query.patientId;
    if (query.orderingDoctorId) filter.orderingDoctorId = query.orderingDoctorId;
    if (query.radiologistId) filter.radiologistId = query.radiologistId;

    const [orders, total] = await Promise.all([
      RadiologyOrderModel.find(filter)
        .populate('patientId', 'firstName lastName mrn gender dateOfBirth')
        .populate('orderingDoctorId', 'firstName lastName role')
        .populate('radiologistId', 'firstName lastName role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      RadiologyOrderModel.countDocuments(filter),
    ]);

    return {
      orders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  public async getOrderById(orderId: string, hospitalId: string): Promise<IRadiologyOrderDocument | null> {
    return RadiologyOrderModel.findOne({ _id: orderId, hospitalId })
      .populate('patientId', 'firstName lastName mrn gender dateOfBirth')
      .populate('orderingDoctorId', 'firstName lastName role')
      .populate('radiologistId', 'firstName lastName role')
      .exec();
  }

  public async updatePacsData(
    orderId: string,
    hospitalId: string,
    input: UpdatePacsMetadataInput
  ): Promise<IRadiologyOrderDocument | null> {
    return RadiologyOrderModel.findOneAndUpdate(
      { _id: orderId, hospitalId },
      {
        $set: {
          pacsMetadata: input,
          status: RadiologyOrderStatus.COMPLETED,
        },
      },
      { new: true }
    ).exec();
  }

  public async completeReport(
    orderId: string,
    hospitalId: string,
    input: CompleteRadiologyReportInput
  ): Promise<IRadiologyOrderDocument | null> {
    return RadiologyOrderModel.findOneAndUpdate(
      { _id: orderId, hospitalId },
      {
        $set: {
          radiologistId: input.radiologistId,
          findings: input.findings,
          impression: input.impression,
          radiologistNotes: input.radiologistNotes,
          status: RadiologyOrderStatus.REPORTED,
          reportedAt: new Date(),
        },
      },
      { new: true }
    ).exec();
  }

  public async cancelOrder(
    orderId: string,
    hospitalId: string,
    cancellationReason: string
  ): Promise<IRadiologyOrderDocument | null> {
    return RadiologyOrderModel.findOneAndUpdate(
      { _id: orderId, hospitalId, status: { $ne: RadiologyOrderStatus.REPORTED } },
      {
        $set: {
          status: RadiologyOrderStatus.CANCELLED,
          cancellationReason,
        },
      },
      { new: true }
    ).exec();
  }
}

export const radiologyService = new RadiologyService();