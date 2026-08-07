import { Types } from 'mongoose';
import { LabOrderModel } from './lab.model.js';
import {
  CreateLabOrderDTO,
  RecordLabResultsDTO,
  GetLabOrdersQueryDTO,
  ILabOrderDocument,
  LabOrderStatus,
} from './lab.types.js';

export class LabService {
  static async createOrder(
    hospitalId: string,
    requestingUserId: string,
    dto: CreateLabOrderDTO
  ): Promise<ILabOrderDocument> {
    const doctorId = dto.doctorId || requestingUserId;

    const order = await LabOrderModel.create({
      hospitalId: new Types.ObjectId(hospitalId),
      patientId: new Types.ObjectId(dto.patientId),
      doctorId: new Types.ObjectId(doctorId),
      consultationId: dto.consultationId ? new Types.ObjectId(dto.consultationId) : undefined,
      testName: dto.testName,
      testCategory: dto.testCategory,
      priority: dto.priority,
      sampleType: dto.sampleType,
      notes: dto.notes,
    });

    return order.populate([
      { path: 'patientId', select: 'firstName lastName mrn dateOfBirth gender' },
      { path: 'doctorId', select: 'firstName lastName email department' },
    ]);
  }

  static async getOrders(hospitalId: string, query: GetLabOrdersQueryDTO) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { hospitalId };

    if (query.patientId) {
      filter.patientId = new Types.ObjectId(query.patientId);
    }

    if (query.doctorId) {
      filter.doctorId = new Types.ObjectId(query.doctorId);
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.priority) {
      filter.priority = query.priority;
    }

    if (query.testCategory) {
      filter.testCategory = { $regex: query.testCategory, $options: 'i' };
    }

    const [orders, total] = await Promise.all([
      LabOrderModel.find(filter)
        .populate('patientId', 'firstName lastName mrn dateOfBirth gender')
        .populate('doctorId', 'firstName lastName email department')
        .populate('labTechnicianId', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      LabOrderModel.countDocuments(filter),
    ]);

    return {
      orders,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  static async getOrderById(hospitalId: string, orderId: string): Promise<ILabOrderDocument> {
    const order = await LabOrderModel.findOne({
      _id: orderId,
      hospitalId,
    }).populate([
      { path: 'patientId', select: 'firstName lastName mrn dateOfBirth gender bloodGroup genotype' },
      { path: 'doctorId', select: 'firstName lastName email department' },
      { path: 'labTechnicianId', select: 'firstName lastName' },
    ]);

    if (!order) {
      const error = new Error('Lab order not found.') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }

    return order;
  }

  static async markSampleCollected(
    hospitalId: string,
    orderId: string,
    technicianId: string
  ): Promise<ILabOrderDocument> {
    const order = await this.getOrderById(hospitalId, orderId);

    order.status = LabOrderStatus.SAMPLE_COLLECTED;
    order.labTechnicianId = new Types.ObjectId(technicianId);
    order.sampleCollectedAt = new Date();

    await order.save();
    return order;
  }

  static async recordResults(
    hospitalId: string,
    orderId: string,
    technicianId: string,
    dto: RecordLabResultsDTO
  ): Promise<ILabOrderDocument> {
    const order = await this.getOrderById(hospitalId, orderId);

    order.results = dto.results;
    order.labTechnicianId = new Types.ObjectId(technicianId);
    order.status = dto.status || LabOrderStatus.COMPLETED;

    if (dto.notes) {
      order.notes = dto.notes;
    }

    if (order.status === LabOrderStatus.COMPLETED) {
      order.completedAt = new Date();
    }

    await order.save();
    return order;
  }
}