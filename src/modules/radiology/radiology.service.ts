import { createHash } from 'crypto';
import { Types } from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';

import { RadiologyOrderModel } from './radiology.model.js';
import { PricingCatalogueModel } from '../billing/billing.model.js';
import { Staff } from '../staff/staff.model.js';
import { createCharge } from '../billing/billing.service.js';
import { BillingSourceModule, ChargeCategory } from '../billing/billing.types.js';

import {
  AssignRadiologyStaffInput,
  AssignmentRole,
  CompleteRadiologyReportInput,
  CreateRadiologyOrderInput,
  ExaminationQueueStatus,
  GetRadiologyOrdersQuery,
  IRadiologyOrderDocument,
  RadiologyOrderStatus,
  UpdateAIAnalysisInput,
  UpdateContrastInput,
  UpdateExaminationStatusInput,
  UpdatePacsMetadataInput,
  UploadPacsImagesInput,
  UpdatePregnancyScreeningInput,
  UpdateRadiationExposureInput,
  UpdateRadiologyOrderInput,
  UpdateQueueInput,
  AmendRadiologyReportInput,
  SignRadiologyReportInput,
  ReportStatus,
  CriticalResultStatus,
  RadiologyBillingStatus,
} from './radiology.types.js';

const isValidObjectId = (value: string): boolean =>
  Types.ObjectId.isValid(value);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export class RadiologyService {
  private assertObjectId(value: string, fieldName: string): void {
    if (!isValidObjectId(value)) {
      throw new Error(`Invalid ${fieldName}`);
    }
  }

  private generateAccessionNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();

    return `RAD-${timestamp}-${random}`;
  }

  /**
   * Return a stable fallback Billing service code for legacy Radiology orders
   * that were created before a pricing catalogue was selected. New orders
   * use the selected catalogue code as the authoritative service code.
   */
  private getBillingServiceCode(order: IRadiologyOrderDocument): string {
    const selectedCode = String(
      (order as any).pricingCatalogueCode || ''
    ).trim().toUpperCase();

    if (selectedCode) return selectedCode;

    const procedure = order.procedureName
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    if (!procedure) {
      throw new Error(
        'Radiology procedure name cannot be converted into a billing service code.'
      );
    }

    return procedure.startsWith('RADIOLOGY_')
      ? procedure
      : `RADIOLOGY_${procedure}`;
  }

  private getContrastBillingSourceId(orderId: string): string {
    return createHash('sha256')
      .update(`radiology:${orderId}:contrast`)
      .digest('hex')
      .slice(0, 24);
  }

  private parseServiceDate(value?: string | Date): Date {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) {
      throw new Error('Invalid Radiology service date.');
    }
    return date;
  }

  /**
   * Return active Radiology pricing catalogues for the hospital. A procedure
   * filter accepts both the legacy procedure-specific code and the new
   * generic RADIOLOGY_PROCEDURE catalogue code.
   */
  public async getPricingCatalogues(
    hospitalId: string,
    procedureName?: string,
    serviceDate?: string | Date
  ) {
    this.assertObjectId(hospitalId, 'hospital ID');

    const now = this.parseServiceDate(serviceDate);
    const filter: Record<string, unknown> = {
      hospitalId: new Types.ObjectId(hospitalId),
      departmentName: { $regex: /^Radiology$/i },
      isActive: true,
      $and: [
        {
          $or: [
            { effectiveFrom: { $exists: false } },
            { effectiveFrom: { $lte: now } },
          ],
        },
        {
          $or: [
            { effectiveTo: { $exists: false } },
            { effectiveTo: null },
            { effectiveTo: { $gte: now } },
          ],
        },
      ],
    };

    if (procedureName?.trim()) {
      const normalized = procedureName
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

      const procedureCode = normalized.startsWith('RADIOLOGY_')
        ? normalized
        : `RADIOLOGY_${normalized}`;

      filter.$or = [
        { code: procedureCode },
        { code: 'RADIOLOGY_PROCEDURE' },
      ];
    }

    return PricingCatalogueModel.find(filter)
      .select(
        '_id code name planName category departmentName price currency version effectiveFrom effectiveTo description isActive'
      )
      .sort({ planName: 1, name: 1, price: 1 })
      .lean()
      .exec();
  }

  private async validatePricingCatalogue(
    hospitalId: string,
    catalogueItemId: string,
    serviceDate?: string | Date
  ) {
    this.assertObjectId(catalogueItemId, 'pricing catalogue item ID');

    const date = this.parseServiceDate(serviceDate);
    const catalogue = await PricingCatalogueModel.findOne({
      _id: catalogueItemId,
      hospitalId: new Types.ObjectId(hospitalId),
      isActive: true,
      departmentName: { $regex: /^Radiology$/i },
    })
      .lean()
      .exec();

    if (!catalogue) {
      throw new Error(
        'Selected pricing catalogue was not found, is inactive, or does not belong to Radiology.'
      );
    }

    if (String(catalogue.category).toUpperCase() !== ChargeCategory.RADIOLOGY) {
      throw new Error(
        'Selected pricing catalogue must use the RADIOLOGY billing category.'
      );
    }

    if (catalogue.effectiveFrom && new Date(catalogue.effectiveFrom) > date) {
      throw new Error('Selected pricing catalogue is not effective for the Radiology service date.');
    }

    if (catalogue.effectiveTo && new Date(catalogue.effectiveTo) < date) {
      throw new Error('Selected pricing catalogue has expired for the Radiology service date.');
    }

    return catalogue;
  }

  /**
   * Capture all applicable radiology charges through the centralized Billing
   * service. Billing failures are deliberately non-blocking: the examination
   * workflow remains successful and the failure is recorded on the order for
   * retry through the manual billing endpoint.
   */
  public async captureBilling(
    orderId: string,
    hospitalId: string,
    capturedBy?: string
  ): Promise<IRadiologyOrderDocument | null> {
    this.assertObjectId(orderId, 'order ID');
    this.assertObjectId(hospitalId, 'hospital ID');

    if (capturedBy) {
      this.assertObjectId(capturedBy, 'captured by ID');
    }

    const order = await RadiologyOrderModel.findOne({
      _id: orderId,
      hospitalId,
    });

    if (!order) return null;

    if (order.status !== RadiologyOrderStatus.REPORTED &&
        order.status !== RadiologyOrderStatus.COMPLETED) {
      throw new Error('Radiology billing can only be captured after the examination is reported or completed.');
    }

    const existingBilling = order.billing;
    if (existingBilling?.status === RadiologyBillingStatus.CAPTURED) {
      return this.populateOrder(orderId, hospitalId);
    }

    const billing = {
      status: RadiologyBillingStatus.NOT_ATTEMPTED,
      chargeIds: existingBilling?.chargeIds || [],
      errors: [] as string[],
      catalogueItemId: order.pricingCatalogueItemId,
      catalogueCode: (order as any).pricingCatalogueCode,
      cataloguePlanName: order.pricingCataloguePlanName,
      cataloguePrice: order.pricingCataloguePrice,
      catalogueVersion: order.pricingCatalogueVersion,
      catalogueCurrency: order.pricingCatalogueCurrency,
      lastAttemptAt: new Date(),
      capturedAt: existingBilling?.capturedAt,
    };

    const existingChargeIds = new Set(
      billing.chargeIds.map((id) => String(id))
    );

    try {
      let selectedCatalogue: any = undefined;
      if (order.pricingCatalogueItemId) {
        selectedCatalogue = await this.validatePricingCatalogue(
          hospitalId,
          String(order.pricingCatalogueItemId),
          order.reportedAt || order.updatedAt || new Date()
        );
      }

      const mainServiceCode = selectedCatalogue?.code || this.getBillingServiceCode(order);

      const mainCharge = await createCharge({
        hospitalId,
        patientId: String(order.patientId),
        description: `${order.procedureName} - ${order.bodyPart}`,
        serviceCode: mainServiceCode,
        catalogueItemId: selectedCatalogue?._id || order.pricingCatalogueItemId,
        category: ChargeCategory.RADIOLOGY,
        sourceModule: BillingSourceModule.RADIOLOGY,
        sourceId: String(order._id),
        departmentName: 'Radiology',
        quantity: 1,
        notes: `Radiology examination ${order.accessionNumber || String(order._id)}`,
        chargedBy: capturedBy,
        chargeDate: order.reportedAt || order.updatedAt || new Date(),
      });

      if (mainCharge?._id && !existingChargeIds.has(String(mainCharge._id))) {
        billing.chargeIds.push(mainCharge._id as Types.ObjectId);
        existingChargeIds.add(String(mainCharge._id));
      }
    } catch (error: any) {
      billing.errors.push(
        `Radiology examination: ${error?.message || 'Unable to create radiology billing charge.'}`
      );
    }

    if (order.contrast?.status === 'ADMINISTERED') {
      try {
        const contrastCharge = await createCharge({
          hospitalId,
          patientId: String(order.patientId),
          description: order.contrast.contrastName
            ? `Contrast - ${order.contrast.contrastName}`
            : 'Radiology contrast administration',
          serviceCode: 'RADIOLOGY_CONTRAST',
          category: ChargeCategory.RADIOLOGY,
          sourceModule: BillingSourceModule.RADIOLOGY,
          sourceId: this.getContrastBillingSourceId(String(order._id)),
          departmentName: 'Radiology',
          quantity: 1,
          notes: order.contrast.notes?.trim(),
          chargedBy: capturedBy,
          chargeDate: order.contrast.administeredAt || order.reportedAt || new Date(),
        });

        if (contrastCharge?._id && !existingChargeIds.has(String(contrastCharge._id))) {
          billing.chargeIds.push(contrastCharge._id as Types.ObjectId);
          existingChargeIds.add(String(contrastCharge._id));
        }
      } catch (error: any) {
        billing.errors.push(
          `Contrast: ${error?.message || 'Unable to create contrast billing charge.'}`
        );
      }
    }

    billing.status =
      billing.errors.length === 0
        ? RadiologyBillingStatus.CAPTURED
        : billing.chargeIds.length > 0
          ? RadiologyBillingStatus.PARTIAL
          : RadiologyBillingStatus.FAILED;

    if (billing.status === RadiologyBillingStatus.CAPTURED) {
      billing.capturedAt = new Date();
    }

    await RadiologyOrderModel.findOneAndUpdate(
      { _id: orderId, hospitalId },
      { $set: { billing } },
      { new: true, runValidators: true }
    ).exec();

    return this.populateOrder(orderId, hospitalId);
  }

  /**
   * Return a radiology order with every staff reference resolved.
   *
   * `assignments.userId` stores Staff document IDs, while `assignedBy`
   * stores Account IDs for the authenticated user who made the assignment.
   * Keeping this population in one place prevents the details page from
   * receiving only raw ObjectIds after assignment/removal.
   */
  private populateOrder(orderId: string, hospitalId: string) {
    return RadiologyOrderModel.findOne({
      _id: orderId,
      hospitalId,
    })
      .populate(
        'patientId',
        'firstName lastName mrn gender dateOfBirth phone email'
      )
      .populate(
        'orderingDoctorId',
        'firstName lastName role department'
      )
      .populate(
        'radiologistId',
        'firstName lastName role department'
      )
      .populate(
        'assignments.userId',
        'firstName middleName lastName title role jobTitle professionalTitle staffId contact employment'
      )
      .populate(
        'assignments.assignedBy',
        'firstName lastName role'
      )
      .populate(
        'scheduling.modalityId',
        'name modality manufacturer model status'
      )
      .exec();
  }

  public async createOrder(
    input: CreateRadiologyOrderInput
  ): Promise<IRadiologyOrderDocument> {
    this.assertObjectId(input.hospitalId, 'hospital ID');
    this.assertObjectId(input.patientId, 'patient ID');
    this.assertObjectId(input.orderingDoctorId, 'ordering doctor ID');

    if (!input.procedureName?.trim()) {
      throw new Error('Procedure name is required');
    }

    if (!input.bodyPart?.trim()) {
      throw new Error('Body part is required');
    }

    if (!input.clinicalIndication?.trim()) {
      throw new Error('Clinical indication is required');
    }

    let pricingCatalogue: any = undefined;
    if (input.pricingCatalogueItemId) {
      pricingCatalogue = await this.validatePricingCatalogue(
        input.hospitalId,
        input.pricingCatalogueItemId,
        input.scheduling?.scheduledDate
      );
    } else {
      const available = await this.getPricingCatalogues(
        input.hospitalId,
        input.procedureName,
        input.scheduling?.scheduledDate
      );
      if (available.length === 1) pricingCatalogue = available[0];
      if (available.length > 1) {
        throw new Error('Multiple Radiology pricing catalogues are available for this examination. Please select one.');
      }
    }

    const accessionNumber =
      input.accessionNumber?.trim() || this.generateAccessionNumber();

    const order = await RadiologyOrderModel.create({
      hospitalId: input.hospitalId,
      patientId: input.patientId,
      orderingDoctorId: input.orderingDoctorId,

      modality: input.modality,

      procedureName: input.procedureName.trim(),
      bodyPart: input.bodyPart.trim(),
      clinicalIndication: input.clinicalIndication.trim(),

      priority: input.priority || 'ROUTINE',
      status: RadiologyOrderStatus.REQUESTED,

      accessionNumber,

      scheduling: input.scheduling
        ? {
            ...input.scheduling,
            scheduledBy: input.orderingDoctorId,
          }
        : undefined,

      patientPreparation: input.patientPreparation,

      pricingCatalogueItemId: pricingCatalogue?._id,
      pricingCatalogueCode: pricingCatalogue?.code,
      pricingCataloguePlanName: pricingCatalogue?.planName || pricingCatalogue?.name,
      pricingCataloguePrice: pricingCatalogue?.price,
      pricingCatalogueVersion: pricingCatalogue?.version,
      pricingCatalogueCurrency: pricingCatalogue?.currency,

      contrast: input.contrast,

      pregnancyScreening: input.pregnancyScreening,

      procedureTracking: {
        queuedAt: new Date(),
      },

      queueStatus: ExaminationQueueStatus.WAITING,

      aiAnalysis: {
        enabled: false,
      },
    });

    return order;
  }

  public async getOrders(
    hospitalId: string,
    query: GetRadiologyOrdersQuery
  ): Promise<{
    orders: IRadiologyOrderDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    this.assertObjectId(hospitalId, 'hospital ID');

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      hospitalId,
    };

    if (query.status) {
      filter.status = query.status;
    }

    if (query.modality) {
      filter.modality = query.modality;
    }

    if (query.priority) {
      filter.priority = query.priority;
    }

    if (query.patientId) {
      this.assertObjectId(query.patientId, 'patient ID');
      filter.patientId = query.patientId;
    }

    if (query.orderingDoctorId) {
      this.assertObjectId(
        query.orderingDoctorId,
        'ordering doctor ID'
      );

      filter.orderingDoctorId = query.orderingDoctorId;
    }

    if (query.radiologistId) {
      this.assertObjectId(
        query.radiologistId,
        'radiologist ID'
      );

      filter.radiologistId = query.radiologistId;
    }

    if (query.queueStatus) {
      filter.queueStatus = query.queueStatus;
    }

    if (query.scheduledDate) {
      const start = new Date(`${query.scheduledDate}T00:00:00`);
      const end = new Date(`${query.scheduledDate}T23:59:59.999`);

      if (
        !Number.isNaN(start.getTime()) &&
        !Number.isNaN(end.getTime())
      ) {
        filter['scheduling.scheduledDate'] = {
          $gte: start,
          $lte: end,
        };
      }
    }

    if (query.search?.trim()) {
      const search = query.search.trim();

      filter.$or = [
        {
          procedureName: {
            $regex: search,
            $options: 'i',
          },
        },
        {
          bodyPart: {
            $regex: search,
            $options: 'i',
          },
        },
        {
          clinicalIndication: {
            $regex: search,
            $options: 'i',
          },
        },
        {
          accessionNumber: {
            $regex: search,
            $options: 'i',
          },
        },
      ];
    }

    const [orders, total] = await Promise.all([
      RadiologyOrderModel.find(filter)
        .populate(
          'patientId',
          'firstName lastName mrn gender dateOfBirth'
        )
        .populate(
          'orderingDoctorId',
          'firstName lastName role department'
        )
        .populate(
          'radiologistId',
          'firstName lastName role department'
        )
        .populate(
          'assignments.userId',
          'firstName middleName lastName title role jobTitle professionalTitle staffId contact employment'
        )
        .populate(
          'assignments.assignedBy',
          'firstName lastName role'
        )
        .sort({
          priority: 1,
          createdAt: -1,
        })
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

  public async getOrderById(
    orderId: string,
    hospitalId: string
  ): Promise<IRadiologyOrderDocument | null> {
    this.assertObjectId(orderId, 'order ID');
    this.assertObjectId(hospitalId, 'hospital ID');

    return this.populateOrder(orderId, hospitalId);
  }

  public async updateOrder(
    orderId: string,
    hospitalId: string,
    input: UpdateRadiologyOrderInput
  ): Promise<IRadiologyOrderDocument | null> {
    this.assertObjectId(orderId, 'order ID');
    this.assertObjectId(hospitalId, 'hospital ID');

    const update: Record<string, unknown> = {};

    if (input.procedureName !== undefined) {
      update.procedureName = input.procedureName.trim();
    }

    if (input.bodyPart !== undefined) {
      update.bodyPart = input.bodyPart.trim();
    }

    if (input.clinicalIndication !== undefined) {
      update.clinicalIndication =
        input.clinicalIndication.trim();
    }

    if (input.modality !== undefined) {
      update.modality = input.modality;
    }

    if (input.priority !== undefined) {
      update.priority = input.priority;
    }

    if (input.scheduling !== undefined) {
      Object.entries(input.scheduling).forEach(
        ([key, value]) => {
          update[`scheduling.${key}`] = value;
        }
      );
    }

    if (input.patientPreparation !== undefined) {
      update.patientPreparation = input.patientPreparation;
    }

    return RadiologyOrderModel.findOneAndUpdate(
      {
        _id: orderId,
        hospitalId,
        status: {
          $nin: [
            RadiologyOrderStatus.COMPLETED,
            RadiologyOrderStatus.CANCELLED,
          ],
        },
      },
      {
        $set: update,
      },
      {
        new: true,
        runValidators: true,
      }
    ).exec();
  }

  public async scheduleOrder(
    orderId: string,
    hospitalId: string,
    scheduling: {
      scheduledDate: string | Date;
      scheduledStartTime: string;
      scheduledEndTime?: string;
      estimatedDurationMinutes?: number;
      modalityId?: string;
      theatreOrRoom?: string;
      scheduledBy: string;
    }
  ): Promise<IRadiologyOrderDocument | null> {
    this.assertObjectId(orderId, 'order ID');
    this.assertObjectId(hospitalId, 'hospital ID');
    this.assertObjectId(scheduling.scheduledBy, 'scheduled by user ID');

    if (scheduling.modalityId) {
      this.assertObjectId(
        scheduling.modalityId,
        'modality ID'
      );
    }

    const scheduledDate = new Date(scheduling.scheduledDate);

    if (Number.isNaN(scheduledDate.getTime())) {
      throw new Error('Invalid scheduled date');
    }

    return RadiologyOrderModel.findOneAndUpdate(
      {
        _id: orderId,
        hospitalId,
        status: {
          $nin: [
            RadiologyOrderStatus.COMPLETED,
            RadiologyOrderStatus.CANCELLED,
          ],
        },
      },
      {
        $set: {
          scheduling: {
            ...scheduling,
            scheduledDate,
            scheduledBy: scheduling.scheduledBy,
          },
          status: RadiologyOrderStatus.SCHEDULED,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).exec();
  }

  public async assignStaff(
    orderId: string,
    hospitalId: string,
    input: AssignRadiologyStaffInput,
    assignedBy: string
  ): Promise<IRadiologyOrderDocument | null> {
    this.assertObjectId(orderId, 'order ID');
    this.assertObjectId(hospitalId, 'hospital ID');
    this.assertObjectId(input.userId, 'user ID');
    this.assertObjectId(assignedBy, 'assigned by user ID');

    const order = await RadiologyOrderModel.findOne({
      _id: orderId,
      hospitalId,
    });

    if (!order) {
      return null;
    }

    // The assigned person is a Staff record, not an Account record.
    // Validate tenant ownership so a staff member from another hospital
    // can never be attached to this radiology order.
    const staffMember = await Staff.findOne({
      _id: input.userId,
      hospitalId,
      isActive: true,
    })
      .select('_id firstName middleName lastName role jobTitle professionalTitle staffId')
      .lean();

    if (!staffMember) {
      throw new Error('Staff member not found or inactive in this hospital');
    }

    const assignments = order.assignments || [];

    const existingIndex = assignments.findIndex(
      (assignment) =>
        String(assignment.userId) === input.userId &&
        assignment.role === input.role
    );

    if (existingIndex >= 0) {
      assignments[existingIndex].notes = input.notes;
    } else {
      assignments.push({
        userId: new Types.ObjectId(input.userId),
        role: input.role,
        assignedAt: new Date(),
        assignedBy: new Types.ObjectId(assignedBy),
        notes: input.notes,
      });
    }

    // `radiologistId` is an Account reference used by the reporting
    // workflow, while assignment.userId is a Staff reference. Do not copy
    // a Staff ObjectId into the Account-backed radiologistId field.

    order.assignments = assignments;

    await order.save();

    // Re-fetch and populate Staff references before returning to the client.
    return this.populateOrder(orderId, hospitalId);
  }

  public async removeStaff(
    orderId: string,
    hospitalId: string,
    userId: string,
    role: AssignmentRole
  ): Promise<IRadiologyOrderDocument | null> {
    this.assertObjectId(orderId, 'order ID');
    this.assertObjectId(hospitalId, 'hospital ID');
    this.assertObjectId(userId, 'user ID');

    const order = await RadiologyOrderModel.findOne({
      _id: orderId,
      hospitalId,
    });

    if (!order) {
      return null;
    }

    order.assignments = (order.assignments || []).filter(
      (assignment) =>
        !(
          String(assignment.userId) === userId &&
          assignment.role === role
        )
    );

    if (
      role === AssignmentRole.RADIOLOGIST &&
      String(order.radiologistId || '') === userId
    ) {
      order.radiologistId = undefined;
    }

    await order.save();

    // Re-fetch and populate Staff references before returning to the client.
    return this.populateOrder(orderId, hospitalId);
  }

  public async updateExaminationStatus(
    orderId: string,
    hospitalId: string,
    input: UpdateExaminationStatusInput
  ): Promise<IRadiologyOrderDocument | null> {
    this.assertObjectId(orderId, 'order ID');
    this.assertObjectId(hospitalId, 'hospital ID');

    const order = await RadiologyOrderModel.findOne({
      _id: orderId,
      hospitalId,
    });

    if (!order) {
      return null;
    }

    const now = new Date();

    order.status = input.status;

    if (!order.procedureTracking) {
      order.procedureTracking = {};
    }

    switch (input.status) {
      case RadiologyOrderStatus.PATIENT_ARRIVED:
        order.procedureTracking.patientArrivedAt = now;
        break;

      case RadiologyOrderStatus.PREPARING:
        order.procedureTracking.preparationStartedAt = now;
        break;

      case RadiologyOrderStatus.READY_FOR_EXAM:
        order.procedureTracking.readyAt = now;
        break;

      case RadiologyOrderStatus.IN_PROGRESS:
        order.procedureTracking.examinationStartedAt = now;
        break;

      case RadiologyOrderStatus.IMAGE_ACQUISITION_COMPLETE:
        order.procedureTracking.imageAcquisitionCompletedAt =
          now;
        break;

      case RadiologyOrderStatus.REPORTING:
        order.procedureTracking.reportingStartedAt = now;
        break;

      case RadiologyOrderStatus.REPORTED:
        order.procedureTracking.reportedAt = now;
        order.reportedAt = now;
        break;

      case RadiologyOrderStatus.COMPLETED:
        order.procedureTracking.completedAt = now;
        break;
    }

    if (input.notes) {
      order.radiologistNotes = input.notes;
    }

    await order.save();

    if (
      input.status === RadiologyOrderStatus.REPORTED ||
      input.status === RadiologyOrderStatus.COMPLETED
    ) {
      try {
        return (await this.captureBilling(orderId, hospitalId)) || order;
      } catch (error: any) {
        await RadiologyOrderModel.findOneAndUpdate(
          { _id: orderId, hospitalId },
          {
            $set: {
              billing: {
                status: RadiologyBillingStatus.FAILED,
                chargeIds: order.billing?.chargeIds || [],
                errors: [
                  error?.message || 'Unable to capture radiology billing.',
                ],
                lastAttemptAt: new Date(),
              },
            },
          }
        ).exec();

        return this.populateOrder(orderId, hospitalId);
      }
    }

    return this.populateOrder(orderId, hospitalId);
  }

  public async updateQueue(
    orderId: string,
    hospitalId: string,
    input: UpdateQueueInput
  ): Promise<IRadiologyOrderDocument | null> {
    this.assertObjectId(orderId, 'order ID');
    this.assertObjectId(hospitalId, 'hospital ID');

    const update: Record<string, unknown> = {};

    if (input.queuePosition !== undefined) {
      if (input.queuePosition < 1) {
        throw new Error('Queue position must be at least 1');
      }

      update.queuePosition = input.queuePosition;
    }

    if (input.queueStatus !== undefined) {
      update.queueStatus = input.queueStatus;

      if (
        input.queueStatus === ExaminationQueueStatus.WAITING
      ) {
        update.status = RadiologyOrderStatus.REQUESTED;
      }

      if (
        input.queueStatus === ExaminationQueueStatus.IN_PROGRESS
      ) {
        update.status = RadiologyOrderStatus.IN_PROGRESS;
      }

      if (
        input.queueStatus === ExaminationQueueStatus.COMPLETED
      ) {
        update.status = RadiologyOrderStatus.COMPLETED;
      }

      if (
        input.queueStatus === ExaminationQueueStatus.CANCELLED
      ) {
        update.status = RadiologyOrderStatus.CANCELLED;
      }
    }

    return RadiologyOrderModel.findOneAndUpdate(
      {
        _id: orderId,
        hospitalId,
      },
      {
        $set: update,
      },
      {
        new: true,
        runValidators: true,
      }
    ).exec();
  }

  private async uploadPacsImage(
    file: Express.Multer.File,
    orderId: string,
    hospitalId: string,
    uploadedBy?: string
  ): Promise<{
    _id: Types.ObjectId;
    url: string;
    secureUrl: string;
    publicId: string;
    originalFilename?: string;
    format?: string;
    resourceType?: string;
    bytes?: number;
    width?: number;
    height?: number;
    uploadedAt: Date;
    uploadedBy?: Types.ObjectId;
  }> {
    if (!file?.buffer?.length) {
      throw new Error('A valid image file is required.');
    }

    const allowedMimeTypes = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/bmp',
      'image/tiff',
      'image/jpg',
    ]);

    if (!allowedMimeTypes.has(file.mimetype.toLowerCase())) {
      throw new Error(
        `Unsupported radiology image type: ${file.mimetype}. Allowed types are JPEG, PNG, WEBP, GIF, BMP and TIFF.`
      );
    }

    const maxBytes = 25 * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new Error('Each radiology image must be 25 MB or smaller.');
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME ||
        !process.env.CLOUDINARY_API_KEY ||
        !process.env.CLOUDINARY_API_SECRET) {
      throw new Error('Cloudinary environment variables are not configured.');
    }

    const folder = `medxverse/radiology/${hospitalId}/${orderId}`;

    const uploaded = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          use_filename: false,
          unique_filename: true,
          overwrite: false,
          tags: ['medxverse', 'radiology'],
          context: {
            hospitalId,
            radiologyOrderId: orderId,
          },
        },
        (error, result) => {
          if (error || !result) {
            reject(error || new Error('Cloudinary upload failed.'));
            return;
          }
          resolve(result);
        }
      );

      stream.end(file.buffer);
    });

    return {
      _id: new Types.ObjectId(),
      url: uploaded.url,
      secureUrl: uploaded.secure_url,
      publicId: uploaded.public_id,
      originalFilename: file.originalname,
      format: uploaded.format,
      resourceType: uploaded.resource_type,
      bytes: uploaded.bytes,
      width: uploaded.width,
      height: uploaded.height,
      uploadedAt: new Date(),
      uploadedBy: uploadedBy
        ? new Types.ObjectId(uploadedBy)
        : undefined,
    };
  }

  public async uploadPacsImages(
    orderId: string,
    hospitalId: string,
    input: UploadPacsImagesInput,
    uploadedBy?: string
  ): Promise<IRadiologyOrderDocument | null> {
    this.assertObjectId(orderId, 'order ID');
    this.assertObjectId(hospitalId, 'hospital ID');

    if (uploadedBy) {
      this.assertObjectId(uploadedBy, 'uploaded by user ID');
    }

    const files = input.files || [];
    if (!files.length) {
      throw new Error('At least one radiology image is required.');
    }

    if (files.length > 20) {
      throw new Error('You can upload a maximum of 20 radiology images at once.');
    }

    const order = await RadiologyOrderModel.findOne({
      _id: orderId,
      hospitalId,
    });

    if (!order) {
      return null;
    }

    if (order.status === RadiologyOrderStatus.CANCELLED) {
      throw new Error('Images cannot be uploaded to a cancelled radiology order.');
    }

    if (order.status === RadiologyOrderStatus.COMPLETED) {
      throw new Error('Images cannot be uploaded to a completed radiology order.');
    }

    const uploadedImages: any[] = [];

    try {
      for (const file of files) {
        const image = await this.uploadPacsImage(
          file,
          orderId,
          hospitalId,
          uploadedBy
        );
        uploadedImages.push(image);
      }

      const currentImages = order.pacsMetadata?.images || [];

      if (!order.pacsMetadata) {
        order.pacsMetadata = {
          images: uploadedImages,
          storageStatus: 'STORED',
        } as any;
      } else {
        order.pacsMetadata.images = [
          ...currentImages,
          ...uploadedImages,
        ];
        order.pacsMetadata.storageStatus = 'STORED';
      }

      if (!order.pacsMetadata) {
        throw new Error('PACS metadata could not be initialized.');
      }

      order.pacsMetadata.imageCount =
        order.pacsMetadata.images?.length || 0;

      await order.save();

      return this.populateOrder(orderId, hospitalId);
    } catch (error) {
      // If a later file fails after earlier uploads succeeded, clean up the
      // Cloudinary assets already created by this request.
      await Promise.allSettled(
        uploadedImages.map((image) =>
          cloudinary.uploader.destroy(image.publicId, {
            resource_type: image.resourceType || 'image',
          })
        )
      );

      throw error;
    }
  }

  public async deletePacsImage(
    orderId: string,
    hospitalId: string,
    imageId: string
  ): Promise<IRadiologyOrderDocument | null> {
    this.assertObjectId(orderId, 'order ID');
    this.assertObjectId(hospitalId, 'hospital ID');
    this.assertObjectId(imageId, 'PACS image ID');

    const order = await RadiologyOrderModel.findOne({
      _id: orderId,
      hospitalId,
    });

    if (!order) {
      return null;
    }

    const images = order.pacsMetadata?.images || [];
    const image = images.find(
      (item: any) => String(item._id) === imageId
    );

    if (!image) {
      throw new Error('PACS image not found.');
    }

    await cloudinary.uploader.destroy(image.publicId, {
      resource_type: image.resourceType || 'image',
    });

    if (order.pacsMetadata) {
      order.pacsMetadata.images = images.filter(
        (item: any) => String(item._id) !== imageId
      );

      if (!order.pacsMetadata) {
        throw new Error('PACS metadata could not be initialized.');
      }

      order.pacsMetadata.imageCount =
        order.pacsMetadata.images?.length || 0;

      if (!order.pacsMetadata.images.length) {
        order.pacsMetadata.storageStatus = 'PENDING';
      }
    }

    await order.save();

    return this.populateOrder(orderId, hospitalId);
  }

  public async updatePacsData(
    orderId: string,
    hospitalId: string,
    input: UpdatePacsMetadataInput
  ): Promise<IRadiologyOrderDocument | null> {
    this.assertObjectId(orderId, 'order ID');
    this.assertObjectId(hospitalId, 'hospital ID');

    const update: Record<string, unknown> = {};

    const stringFields = [
      'studyInstanceUid',
      'seriesInstanceUid',
      'accessionNumber',
      'studyId',
      'dicomViewerUrl',
      'storageLocation',
      'storageStatus',
      'sharedLink',
    ] as const;

    for (const field of stringFields) {
      const value = input[field];
      if (value !== undefined && value !== null) {
        update[`pacsMetadata.${field}`] =
          typeof value === 'string' ? value.trim() : value;
      }
    }

    const numericFields = [
      'imageCount',
      'seriesCount',
    ] as const;

    for (const field of numericFields) {
      const value = input[field];
      if (value !== undefined && value !== null) {
        if (!Number.isFinite(value) || value < 0) {
          throw new Error(`${field} must be a non-negative number`);
        }
        update[`pacsMetadata.${field}`] = value;
      }
    }

    if (input.modality !== undefined && input.modality !== null) {
      update['pacsMetadata.modality'] = input.modality;
    }

    if (input.dicomFileKeys !== undefined) {
      update['pacsMetadata.dicomFileKeys'] = input.dicomFileKeys;
    }

    if (input.keyImageIds !== undefined) {
      update['pacsMetadata.keyImageIds'] = input.keyImageIds;
    }

    if (input.priorStudyInstanceUids !== undefined) {
      update['pacsMetadata.priorStudyInstanceUids'] =
        input.priorStudyInstanceUids;
    }

    if (input.exportEnabled !== undefined) {
      update['pacsMetadata.exportEnabled'] = input.exportEnabled;
    }

    if (input.studyDate !== undefined && input.studyDate !== null && input.studyDate !== '') {
      const date = new Date(input.studyDate);
      if (Number.isNaN(date.getTime())) {
        throw new Error('Invalid PACS study date');
      }
      update['pacsMetadata.studyDate'] = date;
    }

    if (input.sharedLinkExpiresAt !== undefined && input.sharedLinkExpiresAt !== null && input.sharedLinkExpiresAt !== '') {
      const date = new Date(input.sharedLinkExpiresAt);
      if (Number.isNaN(date.getTime())) {
        throw new Error('Invalid PACS shared-link expiry date');
      }
      update['pacsMetadata.sharedLinkExpiresAt'] = date;
    }

    if (Object.keys(update).length === 0) {
      throw new Error('At least one PACS field is required');
    }

    return RadiologyOrderModel.findOneAndUpdate(
      {
        _id: orderId,
        hospitalId,
      },
      { $set: update },
      {
        new: true,
        runValidators: true,
      }
    ).exec();
  }

  public async updateContrast(
    orderId: string,
    hospitalId: string,
    input: UpdateContrastInput,
    administeredBy?: string
  ): Promise<IRadiologyOrderDocument | null> {
    this.assertObjectId(orderId, 'order ID');
    this.assertObjectId(hospitalId, 'hospital ID');

    if (administeredBy) {
      this.assertObjectId(
        administeredBy,
        'administered by user ID'
      );
    }

    const contrast: Record<string, unknown> = {
      ...input,
    };

    if (
      input.status === 'ADMINISTERED'
    ) {
      contrast.administeredAt = new Date();

      if (administeredBy) {
        contrast.administeredBy = administeredBy;
      }
    }

    return RadiologyOrderModel.findOneAndUpdate(
      {
        _id: orderId,
        hospitalId,
      },
      {
        $set: {
          contrast,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).exec();
  }

  public async updatePregnancyScreening(
    orderId: string,
    hospitalId: string,
    input: UpdatePregnancyScreeningInput,
    screenedBy: string
  ): Promise<IRadiologyOrderDocument | null> {
    this.assertObjectId(orderId, 'order ID');
    this.assertObjectId(hospitalId, 'hospital ID');
    this.assertObjectId(screenedBy, 'screened by user ID');

    return RadiologyOrderModel.findOneAndUpdate(
      {
        _id: orderId,
        hospitalId,
      },
      {
        $set: {
          pregnancyScreening: {
            ...input,
            screenedAt: new Date(),
            screenedBy,
          },
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).exec();
  }

  public async updateRadiationExposure(
    orderId: string,
    hospitalId: string,
    input: UpdateRadiationExposureInput,
    recordedBy: string
  ): Promise<IRadiologyOrderDocument | null> {
    this.assertObjectId(orderId, 'order ID');
    this.assertObjectId(hospitalId, 'hospital ID');
    this.assertObjectId(recordedBy, 'recorded by user ID');

    return RadiologyOrderModel.findOneAndUpdate(
      {
        _id: orderId,
        hospitalId,
      },
      {
        $set: {
          radiationExposure: {
            ...input,
            recordedAt: new Date(),
            recordedBy,
          },
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).exec();
  }

  public async completeReport(
    orderId: string,
    hospitalId: string,
    input: CompleteRadiologyReportInput
  ): Promise<IRadiologyOrderDocument | null> {
    this.assertObjectId(orderId, 'order ID');
    this.assertObjectId(hospitalId, 'hospital ID');
    this.assertObjectId(input.radiologistId, 'radiologist ID');

    const findings = input.findings?.trim();
    const impression = input.impression?.trim();

    if (!findings) {
      throw new Error('Findings are required');
    }

    if (!impression) {
      throw new Error('Impression is required');
    }

    const order = await RadiologyOrderModel.findOne({
      _id: orderId,
      hospitalId,
    }).select('_id report');

    if (!order) {
      return null;
    }

    const now = new Date();
    const nextVersion = (order.report?.version || 0) + 1;
    const critical = input.criticalResult;

    const set: Record<string, unknown> = {
      radiologistId: new Types.ObjectId(input.radiologistId),
      findings,
      impression,
      'report.status': ReportStatus.DRAFT,
      'report.findings': findings,
      'report.impression': impression,
      'report.version': nextVersion,
      'report.draftedAt': now,
      status: RadiologyOrderStatus.REPORTING,
    };

    if (input.radiologistNotes !== undefined) {
      set.radiologistNotes = input.radiologistNotes?.trim() || undefined;
      set['report.radiologistNotes'] = input.radiologistNotes?.trim() || undefined;
    }

    if (input.templateId !== undefined) {
      set['report.templateId'] = input.templateId?.trim() || undefined;
    }

    if (critical) {
      if (critical.status !== undefined) {
        set['report.criticalResult.status'] = critical.status;
      }
      if (critical.finding !== undefined) {
        set['report.criticalResult.finding'] = critical.finding?.trim() || undefined;
      }
      if (critical.notifiedUserId !== undefined && critical.notifiedUserId !== '') {
        this.assertObjectId(critical.notifiedUserId, 'notified user ID');
        set['report.criticalResult.notifiedUserId'] = new Types.ObjectId(critical.notifiedUserId);
      }
      if (critical.notificationMethod !== undefined) {
        set['report.criticalResult.notificationMethod'] = critical.notificationMethod;
      }
      if (critical.notificationNotes !== undefined) {
        set['report.criticalResult.notificationNotes'] = critical.notificationNotes?.trim() || undefined;
      }
    } else if (!order.report) {
      set['report.criticalResult.status'] = CriticalResultStatus.NOT_APPLICABLE;
    }

    const updated = await RadiologyOrderModel.findOneAndUpdate(
      { _id: orderId, hospitalId },
      {
        $set: set,
        ...(order.report ? {} : { $setOnInsert: {} }),
      },
      {
        new: true,
        runValidators: true,
      }
    ).exec();

    return updated;
  }

  public async signReport(
    orderId: string,
    hospitalId: string,
    input: SignRadiologyReportInput
  ): Promise<IRadiologyOrderDocument | null> {
    this.assertObjectId(orderId, 'order ID');
    this.assertObjectId(hospitalId, 'hospital ID');
    this.assertObjectId(input.radiologistId, 'radiologist ID');

    const order = await RadiologyOrderModel.findOne({
      _id: orderId,
      hospitalId,
    });

    if (!order || !order.report) {
      return null;
    }

    if (!order.report.findings || !order.report.impression) {
      throw new Error(
        'A report must contain findings and impression before signing'
      );
    }

    const now = new Date();

    order.report.status = ReportStatus.FINAL;
    order.report.signedAt = now;
    order.report.signedBy = new Types.ObjectId(
      input.radiologistId
    );

    order.report.versions =
      order.report.versions || [];

    order.report.versions.push({
      version: order.report.version || 1,
      findings: order.report.findings,
      impression: order.report.impression,
      radiologistNotes:
        order.report.radiologistNotes,
      status: ReportStatus.FINAL,
      createdBy: new Types.ObjectId(
        input.radiologistId
      ),
      createdAt: now,
      signedAt: now,
    });

    order.status = RadiologyOrderStatus.REPORTED;
    order.reportedAt = now;

    if (order.procedureTracking) {
      order.procedureTracking.reportedAt = now;
    }

    await order.save();

    try {
      return (await this.captureBilling(
        orderId,
        hospitalId,
        input.radiologistId
      )) || order;
    } catch (error: any) {
      await RadiologyOrderModel.findOneAndUpdate(
        { _id: orderId, hospitalId },
        {
          $set: {
            billing: {
              status: RadiologyBillingStatus.FAILED,
              chargeIds: order.billing?.chargeIds || [],
              errors: [
                error?.message || 'Unable to capture radiology billing.',
              ],
              lastAttemptAt: new Date(),
            },
          },
        }
      ).exec();

      return this.populateOrder(orderId, hospitalId);
    }
  }

  public async amendReport(
    orderId: string,
    hospitalId: string,
    input: AmendRadiologyReportInput
  ): Promise<IRadiologyOrderDocument | null> {
    this.assertObjectId(orderId, 'order ID');
    this.assertObjectId(hospitalId, 'hospital ID');
    this.assertObjectId(input.radiologistId, 'radiologist ID');

    if (!input.amendmentReason?.trim()) {
      throw new Error('Amendment reason is required');
    }

    const order = await RadiologyOrderModel.findOne({
      _id: orderId,
      hospitalId,
    });

    if (!order || !order.report) {
      return null;
    }

    const now = new Date();

    order.report.versions =
      order.report.versions || [];

    order.report.versions.push({
      version: order.report.version || 1,
      findings: order.report.findings || '',
      impression: order.report.impression || '',
      radiologistNotes:
        order.report.radiologistNotes,
      status: order.report.status || ReportStatus.FINAL,
      createdBy: new Types.ObjectId(
        input.radiologistId
      ),
      createdAt: now,
      signedAt: order.report.signedAt,
    });

    order.report.version =
      (order.report.version || 0) + 1;

    order.report.findings = input.findings;
    order.report.impression = input.impression;
    order.report.radiologistNotes =
      input.radiologistNotes;
    order.report.status = ReportStatus.AMENDED;
    order.report.amendedAt = now;
    order.report.amendmentReason =
      input.amendmentReason;

    order.findings = input.findings;
    order.impression = input.impression;
    order.radiologistNotes =
      input.radiologistNotes;

    await order.save();

    return order;
  }

  public async updateCriticalResult(
    orderId: string,
    hospitalId: string,
    criticalResult: {
      status: CriticalResultStatus;
      finding?: string;
      notifiedUserId?: string;
      notificationMethod?:
        | 'PHONE'
        | 'SMS'
        | 'EMAIL'
        | 'IN_APP';
      notificationNotes?: string;
    }
  ): Promise<IRadiologyOrderDocument | null> {
    this.assertObjectId(orderId, 'order ID');
    this.assertObjectId(hospitalId, 'hospital ID');

    if (criticalResult.notifiedUserId) {
      this.assertObjectId(
        criticalResult.notifiedUserId,
        'notified user ID'
      );
    }

    const update: Record<string, unknown> = {
      'report.criticalResult.status':
        criticalResult.status,

      'report.criticalResult.finding':
        criticalResult.finding,

      'report.criticalResult.notificationMethod':
        criticalResult.notificationMethod,

      'report.criticalResult.notificationNotes':
        criticalResult.notificationNotes,
    };

    if (
      criticalResult.status ===
      CriticalResultStatus.NOTIFIED
    ) {
      update['report.criticalResult.notifiedAt'] =
        new Date();

      update['report.criticalResult.notifiedUserId'] =
        criticalResult.notifiedUserId;
    }

    if (
      criticalResult.status ===
      CriticalResultStatus.ACKNOWLEDGED
    ) {
      update['report.criticalResult.acknowledgedAt'] =
        new Date();
    }

    return RadiologyOrderModel.findOneAndUpdate(
      {
        _id: orderId,
        hospitalId,
      },
      {
        $set: update,
      },
      {
        new: true,
        runValidators: true,
      }
    ).exec();
  }

  public async updateAIAnalysis(
    orderId: string,
    hospitalId: string,
    input: UpdateAIAnalysisInput
  ): Promise<IRadiologyOrderDocument | null> {
    this.assertObjectId(orderId, 'order ID');
    this.assertObjectId(hospitalId, 'hospital ID');

    if (
      input.confidence !== undefined &&
      (input.confidence < 0 ||
        input.confidence > 1)
    ) {
      throw new Error(
        'AI confidence must be between 0 and 1'
      );
    }

    return RadiologyOrderModel.findOneAndUpdate(
      {
        _id: orderId,
        hospitalId,
      },
      {
        $set: {
          aiAnalysis: {
            ...input,
            processedAt: new Date(),
          },
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).exec();
  }

  public async cancelOrder(
    orderId: string,
    hospitalId: string,
    cancellationReason: string
  ): Promise<IRadiologyOrderDocument | null> {
    this.assertObjectId(orderId, 'order ID');
    this.assertObjectId(hospitalId, 'hospital ID');

    if (!cancellationReason?.trim()) {
      throw new Error('Cancellation reason is required');
    }

    return RadiologyOrderModel.findOneAndUpdate(
      {
        _id: orderId,
        hospitalId,
        status: {
          $nin: [
            RadiologyOrderStatus.COMPLETED,
            RadiologyOrderStatus.REPORTED,
            RadiologyOrderStatus.CANCELLED,
          ],
        },
      },
      {
        $set: {
          status: RadiologyOrderStatus.CANCELLED,
          cancellationReason:
            cancellationReason.trim(),
          queueStatus:
            ExaminationQueueStatus.CANCELLED,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).exec();
  }
}

export const radiologyService = new RadiologyService();