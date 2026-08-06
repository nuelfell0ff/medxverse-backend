import { LabTestCatalog, LabOrder } from './laboratory.model.js';
import { OPDVisit } from '../opd/opd.model.js';
import {
  CreateLabTestCatalogDto,
  UpdateLabTestCatalogDto,
  CreateLabOrderDto,
  UpdateLabResultDto,
  LabOrderQueryFilters,
  ILabOrderItem,
} from './laboratory.types.js';
import { ApiError } from '../../utils/ApiError.js';

export class LaboratoryService {
  /**
   * Helper to generate unique order numbers
   */
  private static generateOrderNumber(): string {
    const date = new Date();
    const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const random = Math.floor(10000 + Math.random() * 90000);
    return `LAB-${yearMonth}-${random}`;
  }

  /**
   * Helper to generate unique catalog test codes
   */
  private static generateTestCode(name: string): string {
    const prefix = name.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();
    const random = Math.floor(100 + Math.random() * 900);
    return `TST-${prefix}${random}`;
  }

  /**
   * Adds a new lab test offering to the catalog
   */
  static async createLabTestCatalogItem(dto: CreateLabTestCatalogDto, organizationId: string) {
    const code = dto.code ? dto.code.toUpperCase() : this.generateTestCode(dto.name);

    const existingCode = await LabTestCatalog.findOne({ code });
    if (existingCode) {
      throw new ApiError(409, `Test code '${code}' already exists.`);
    }

    const testItem = await LabTestCatalog.create({
      ...dto,
      code,
      organizationId,
    });

    return testItem;
  }

  /**
   * Gets all available laboratory catalog tests
   */
  static async getLabTestCatalog(organizationId: string, category?: string) {
    const query: any = { organizationId, isActive: true };
    if (category) query.category = category;

    return LabTestCatalog.find(query).sort({ category: 1, name: 1 });
  }

  /**
   * Retrieves single catalog item
   */
  static async getLabTestCatalogById(id: string, organizationId: string) {
    const testItem = await LabTestCatalog.findOne({ _id: id, organizationId });
    if (!testItem) {
      throw new ApiError(404, 'Lab test catalog entry not found.');
    }
    return testItem;
  }

  /**
   * Updates lab test catalog entry
   */
  static async updateLabTestCatalogItem(
    id: string,
    dto: UpdateLabTestCatalogDto,
    organizationId: string
  ) {
    const testItem = await LabTestCatalog.findOneAndUpdate(
      { _id: id, organizationId },
      { $set: dto },
      { new: true, runValidators: true }
    );

    if (!testItem) {
      throw new ApiError(404, 'Lab test catalog entry not found.');
    }

    return testItem;
  }

  /**
   * Creates a laboratory request order for a patient
   */
  static async createLabOrder(
    dto: CreateLabOrderDto,
    doctorId: string,
    organizationId: string
  ) {
    if (!dto.testCatalogIds || dto.testCatalogIds.length === 0) {
      throw new ApiError(400, 'At least one lab test must be selected for the order.');
    }

    const catalogItems = await LabTestCatalog.find({
      _id: { $in: dto.testCatalogIds },
      organizationId,
      isActive: true,
    });

    if (catalogItems.length !== dto.testCatalogIds.length) {
      throw new ApiError(400, 'One or more selected lab tests are invalid or inactive.');
    }

    let totalAmount = 0;
    const orderItems: ILabOrderItem[] = catalogItems.map((item) => {
      totalAmount += item.price;
      return {
        testCatalogId: item._id,
        testName: item.name,
        category: item.category,
        price: item.price,
        status: 'PENDING',
      };
    });

    const orderNumber = this.generateOrderNumber();

    const labOrder = await LabOrder.create({
      orderNumber,
      patientId: dto.patientId,
      opdVisitId: dto.opdVisitId,
      orderedBy: doctorId,
      organizationId,
      items: orderItems,
      totalAmount,
      priority: dto.priority || 'ROUTINE',
      paymentStatus: dto.paymentStatus || 'PENDING',
      clinicalNotes: dto.clinicalNotes,
    });

    // Link lab test request to OPD visit record if provided
    if (dto.opdVisitId) {
      const visit = (await OPDVisit.findOne({ _id: dto.opdVisitId, organizationId })) as any;
      if (visit) {
        if (!visit.labRequests) {
          visit.labRequests = [];
        }

        catalogItems.forEach((item) => {
          visit.labRequests.push({
            testName: item.name,
            category: item.category,
            status: 'PENDING',
          });
        });

        visit.markModified('labRequests');
        await visit.save();
      }
    }

    return labOrder.populate([
      { path: 'patientId', select: 'firstName lastName mrn insuranceType' },
      { path: 'orderedBy', select: 'firstName lastName staffCode department' },
    ]);
  }

  /**
   * Gets list of lab orders with filtering options
   */
  static async getLabOrders(organizationId: string, filters: LabOrderQueryFilters) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const query: any = { organizationId };

    if (filters.patientId) query.patientId = filters.patientId;
    if (filters.priority) query.priority = filters.priority;
    if (filters.status) query['items.status'] = filters.status;

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    const [orders, total] = await Promise.all([
      LabOrder.find(query)
        .populate('patientId', 'firstName lastName mrn gender dateOfBirth')
        .populate('orderedBy', 'firstName lastName staffCode')
        .populate('labTechnicianId', 'firstName lastName staffCode')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      LabOrder.countDocuments(query),
    ]);

    return {
      orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves single lab order by ID
   */
  static async getLabOrderById(id: string, organizationId: string) {
    const order = await LabOrder.findOne({ _id: id, organizationId })
      .populate('patientId', 'firstName lastName mrn gender dateOfBirth insuranceType')
      .populate('orderedBy', 'firstName lastName staffCode department')
      .populate('labTechnicianId', 'firstName lastName staffCode');

    if (!order) {
      throw new ApiError(404, 'Lab order not found.');
    }

    return order;
  }

  /**
   * Updates result data for a specific test item inside a lab order
   */
  static async updateLabTestResult(
    orderId: string,
    itemId: string,
    dto: UpdateLabResultDto,
    technicianId: string,
    organizationId: string
  ) {
    const order = await LabOrder.findOne({ _id: orderId, organizationId });
    if (!order) {
      throw new ApiError(404, 'Lab order not found.');
    }

    const item = order.items.find((i: any) => i._id.toString() === itemId);
    if (!item) {
      throw new ApiError(404, 'Test item not found in this order.');
    }

    if (dto.parameters) item.parameters = dto.parameters;
    if (dto.overallResult !== undefined) item.overallResult = dto.overallResult;
    if (dto.remarks !== undefined) item.remarks = dto.remarks;

    const targetStatus = dto.status || 'COMPLETED';
    item.status = targetStatus;

    if (targetStatus === 'IN_PROGRESS' && !item.sampleCollectedAt) {
      item.sampleCollectedAt = new Date();
    }

    if (targetStatus === 'COMPLETED') {
      item.completedAt = new Date();
    }

    order.labTechnicianId = technicianId as any;
    await order.save();

    // Reflect test completion on linked OPD visit
    if (order.opdVisitId && targetStatus === 'COMPLETED') {
      const visit = (await OPDVisit.findOne({ _id: order.opdVisitId, organizationId })) as any;
      if (visit && visit.labRequests) {
        const opdLabItem = visit.labRequests.find(
          (lr: { testName?: string }) =>
            lr.testName && lr.testName.toLowerCase() === item.testName.toLowerCase()
        );

        if (opdLabItem) {
          opdLabItem.status = 'COMPLETED';
          opdLabItem.resultSummary = item.overallResult;
          visit.markModified('labRequests');
          await visit.save();
        }
      }
    }

    return order.populate([
      { path: 'patientId', select: 'firstName lastName mrn' },
      { path: 'labTechnicianId', select: 'firstName lastName staffCode' },
    ]);
  }
}