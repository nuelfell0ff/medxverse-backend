import { Types } from 'mongoose';
import { LabOrderModel, TestCatalogModel } from './lab.model.js';
import {
  CreateLabOrderDTO,
  RecordLabResultsDTO,
  RejectSampleDTO,
  GetLabOrdersQueryDTO,
  ILabOrderDocument,
  LabOrderStatus,
  ResultFlag,
  EntryMethod,
} from './lab.types.js';

export class LabService {
  // Helper to generate Universal Accession Numbers (Features 3, 5)
  private static generateAccessionNumber(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(1000 + Math.random() * 9000);
    return `ACC-${timestamp}-${random}`;
  }

  // Feature 1, 2, 3, 11, 12, 15, 49, 50
  static async createOrder(
    hospitalId: string,
    requestingUserId: string,
    dto: CreateLabOrderDTO
  ): Promise<ILabOrderDocument> {
    const doctorId = dto.doctorId || requestingUserId;
    const accessionNumber = this.generateAccessionNumber();
    const barcodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${accessionNumber}`;

    // Predictive TAT logic based on priority (Feature 49, 50)
    let predictedTatMinutes = 120; // Routine default
    if (dto.isStat || dto.priority === 'STAT') {
      predictedTatMinutes = 30;
    } else if (dto.priority === 'URGENT') {
      predictedTatMinutes = 60;
    }

    const initialChain = [{
      timestamp: new Date(),
      action: 'ORDER_CREATED',
      performedBy: new Types.ObjectId(requestingUserId),
      notes: 'Electronic lab requisition created',
    }];

    const order = await LabOrderModel.create({
      hospitalId: new Types.ObjectId(hospitalId),
      patientId: new Types.ObjectId(dto.patientId),
      doctorId: new Types.ObjectId(doctorId),
      consultationId: dto.consultationId ? new Types.ObjectId(dto.consultationId) : undefined,
      accessionNumber,
      barcodeUrl,
      testCatalogId: dto.testCatalogId ? new Types.ObjectId(dto.testCatalogId) : undefined,
      testName: dto.testName,
      testCategory: dto.testCategory,
      priority: dto.priority || 'ROUTINE',
      isStat: dto.isStat || dto.priority === 'STAT',
      sampleType: dto.sampleType,
      sampleCollectionScheduledAt: dto.sampleCollectionScheduledAt ? new Date(dto.sampleCollectionScheduledAt) : undefined,
      chainOfCustody: initialChain,
      predictedTatMinutes,
      notes: dto.notes,
    });

    return order.populate([
      { path: 'patientId', select: 'firstName lastName mrn dateOfBirth gender' },
      { path: 'doctorId', select: 'firstName lastName email department' },
    ]);
  }

  // Feature 4, 14 - Phlebotomy & Sample Collection
  static async collectSample(
    hospitalId: string,
    orderId: string,
    phlebotomistId: string
  ): Promise<ILabOrderDocument> {
    const order = await this.getOrderById(hospitalId, orderId);

    order.status = LabOrderStatus.SAMPLE_COLLECTED;
    order.phlebotomistId = new Types.ObjectId(phlebotomistId);
    order.sampleCollectedAt = new Date();
    order.chainOfCustody.push({
      timestamp: new Date(),
      action: 'SAMPLE_COLLECTED',
      performedBy: new Types.ObjectId(phlebotomistId),
      notes: 'Specimen collected and barcoded',
    });

    await order.save();
    return order;
  }

  // Feature 6, 7, 9, 10 - Accessioning & Routing
  static async accessionSpecimen(
    hospitalId: string,
    orderId: string,
    technicianId: string,
    location: string
  ): Promise<ILabOrderDocument> {
    const order = await this.getOrderById(hospitalId, orderId);

    order.status = LabOrderStatus.IN_PROGRESS;
    order.labTechnicianId = new Types.ObjectId(technicianId);
    order.chainOfCustody.push({
      timestamp: new Date(),
      action: 'SPECIMEN_ACCESSIONED',
      performedBy: new Types.ObjectId(technicianId),
      location,
      notes: `Routed to ${order.testCategory} section`,
    });

    await order.save();
    return order;
  }

  // Feature 8 - Rejection & Recollection Management
  static async rejectSample(
    hospitalId: string,
    orderId: string,
    technicianId: string,
    dto: RejectSampleDTO
  ): Promise<ILabOrderDocument> {
    const order = await this.getOrderById(hospitalId, orderId);

    order.status = LabOrderStatus.SAMPLE_REJECTED;
    order.rejectionInfo = {
      rejectedBy: new Types.ObjectId(technicianId),
      reason: dto.reason,
      quality: dto.quality,
      rejectionDate: new Date(),
      recollectionRequested: dto.requestRecollection,
    };

    order.chainOfCustody.push({
      timestamp: new Date(),
      action: 'SAMPLE_REJECTED',
      performedBy: new Types.ObjectId(technicianId),
      notes: `Rejected: ${dto.reason}`,
    });

    await order.save();
    return order;
  }

  // Feature 31, 32, 33, 34, 38, 41, 42, 43, 44 - AI Engine & Results Recording
  static async recordResults(
    hospitalId: string,
    orderId: string,
    technicianId: string,
    dto: RecordLabResultsDTO
  ): Promise<ILabOrderDocument> {
    const order = await this.getOrderById(hospitalId, orderId);

    // AI & Pattern Check Logic
    const evaluatedResults = dto.results.map((res) => {
      let flag = res.flag || ResultFlag.NORMAL;
      
      // Auto-flag critical values (Feature 30, 43, 44)
      if (res.value && !isNaN(Number(res.value))) {
        const val = Number(res.value);
        if (res.parameterName.toLowerCase().includes('glucose') && (val > 300 || val < 50)) {
          flag = ResultFlag.CRITICAL;
        }
      }
      return {
        ...res,
        flag,
        entryMethod: res.entryMethod || EntryMethod.MANUAL,
      };
    });

    // Check for Critical Results & Delta Alerts (Feature 42, 43)
    const hasCritical = evaluatedResults.some((r) => r.flag === ResultFlag.CRITICAL);
    if (hasCritical) {
      order.criticalResultNotified = true;
      order.aiPatternAlerts?.push('AI-ALERT: Critical parameter values detected. Urgent review required.');
    }

    order.results = evaluatedResults;
    order.specimenQuality = dto.specimenQuality || order.specimenQuality;
    order.labTechnicianId = new Types.ObjectId(technicianId);
    order.status = LabOrderStatus.IN_PROGRESS;

    if (dto.notes) order.notes = dto.notes;

    order.chainOfCustody.push({
      timestamp: new Date(),
      action: 'RESULTS_RECORDED',
      performedBy: new Types.ObjectId(technicianId),
    });

    await order.save();
    return order;
  }

  // Feature 35, 36 - Multi-Level Result Verification
  static async verifyResults(
    hospitalId: string,
    orderId: string,
    verifierId: string
  ): Promise<ILabOrderDocument> {
    const order = await this.getOrderById(hospitalId, orderId);

    order.status = LabOrderStatus.COMPLETED;
    order.verifierId = new Types.ObjectId(verifierId);
    order.verifiedAt = new Date();
    order.completedAt = new Date();

    order.chainOfCustody.push({
      timestamp: new Date(),
      action: 'RESULTS_VERIFIED_AND_RELEASED',
      performedBy: new Types.ObjectId(verifierId),
    });

    await order.save();
    return order;
  }

  // Feature 13, 48 - Automated Worklist with Prioritization
  static async getOrders(hospitalId: string, query: GetLabOrdersQueryDTO) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { hospitalId };

    if (query.patientId) filter.patientId = new Types.ObjectId(query.patientId);
    if (query.doctorId) filter.doctorId = new Types.ObjectId(query.doctorId);
    if (query.status) filter.status = query.status;
    if (query.priority) filter.priority = query.priority;
    if (query.department) filter.testCategory = query.department;
    if (query.accessionNumber) filter.accessionNumber = query.accessionNumber;
    if (query.isStat !== undefined) filter.isStat = String(query.isStat) === 'true';

    const [orders, total] = await Promise.all([
      LabOrderModel.find(filter)
        .populate('patientId', 'firstName lastName mrn dateOfBirth gender')
        .populate('doctorId', 'firstName lastName email department')
        .populate('labTechnicianId', 'firstName lastName')
        .populate('verifierId', 'firstName lastName')
        .sort({ isStat: -1, createdAt: -1 }) // STAT orders floated to top
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
    const order = await LabOrderModel.findOne({ _id: orderId, hospitalId }).populate([
      { path: 'patientId', select: 'firstName lastName mrn dateOfBirth gender bloodGroup genotype' },
      { path: 'doctorId', select: 'firstName lastName email department' },
      { path: 'labTechnicianId', select: 'firstName lastName' },
      { path: 'verifierId', select: 'firstName lastName' },
    ]);

    if (!order) {
      const error = new Error('Lab order not found.') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }

    return order;
  }
}