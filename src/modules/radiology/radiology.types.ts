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
  /**
   * Create a new radiology order.
   */
  public async createOrder(
    input: CreateRadiologyOrderInput
  ): Promise<IRadiologyOrderDocument> {
    const order = await RadiologyOrderModel.create({
      hospitalId: input.hospitalId,
      patientId: input.patientId,
      orderingDoctorId: input.orderingDoctorId,
      modality: input.modality,
      procedureName: input.procedureName,
      bodyPart: input.bodyPart,
      clinicalIndication: input.clinicalIndication,
      priority: input.priority,
      status: RadiologyOrderStatus.REQUESTED,
    });

    return order;
  }

  /**
   * Get radiology orders with pagination and filters.
   */
  public async getOrders(
    hospitalId: string,
    query: GetRadiologyOrdersQuery
  ): Promise<{
    orders: IRadiologyOrderDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
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

    if (query.patientId) {
      filter.patientId = query.patientId;
    }

    if (query.orderingDoctorId) {
      filter.orderingDoctorId = query.orderingDoctorId;
    }

    if (query.radiologistId) {
      filter.radiologistId = query.radiologistId;
    }

    const [orders, total] = await Promise.all([
      RadiologyOrderModel.find(filter)
        .populate(
          'patientId',
          'firstName lastName mrn gender dateOfBirth'
        )
        .populate(
          'orderingDoctorId',
          'firstName lastName role'
        )
        .populate(
          'radiologistId',
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

  /**
   * Get a single radiology order.
   */
  public async getOrderById(
    orderId: string,
    hospitalId: string
  ): Promise<IRadiologyOrderDocument | null> {
    return RadiologyOrderModel.findOne({
      _id: orderId,
      hospitalId,
    })
      .populate(
        'patientId',
        'firstName lastName mrn gender dateOfBirth'
      )
      .populate(
        'orderingDoctorId',
        'firstName lastName role'
      )
      .populate(
        'radiologistId',
        'firstName lastName role'
      )
      .exec();
  }

  /**
   * Update PACS information for a radiology study.
   *
   * This is normally used after the examination has been performed
   * and the study has been received by PACS.
   */
  public async updatePacsData(
    orderId: string,
    hospitalId: string,
    input: UpdatePacsMetadataInput
  ): Promise<IRadiologyOrderDocument | null> {
    const update: Record<string, unknown> = {};

    if (input.studyInstanceUid !== undefined) {
      update['pacsMetadata.studyInstanceUid'] =
        input.studyInstanceUid;
    }

    if (input.seriesInstanceUid !== undefined) {
      update['pacsMetadata.seriesInstanceUid'] =
        input.seriesInstanceUid;
    }

    if (input.imageCount !== undefined) {
      update['pacsMetadata.imageCount'] =
        input.imageCount;
    }

    if (input.dicomViewerUrl !== undefined) {
      update['pacsMetadata.dicomViewerUrl'] =
        input.dicomViewerUrl;
    }

    if (input.dicomFileKeys !== undefined) {
      update['pacsMetadata.dicomFileKeys'] =
        input.dicomFileKeys;
    }

    update.status = RadiologyOrderStatus.COMPLETED;

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
    )
      .populate(
        'patientId',
        'firstName lastName mrn gender dateOfBirth'
      )
      .populate(
        'orderingDoctorId',
        'firstName lastName role'
      )
      .populate(
        'radiologistId',
        'firstName lastName role'
      )
      .exec();
  }

  /**
   * Complete a radiology report.
   */
  public async completeReport(
    orderId: string,
    hospitalId: string,
    input: CompleteRadiologyReportInput
  ): Promise<IRadiologyOrderDocument | null> {
    return RadiologyOrderModel.findOneAndUpdate(
      {
        _id: orderId,
        hospitalId,
      },
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
      {
        new: true,
        runValidators: true,
      }
    )
      .populate(
        'patientId',
        'firstName lastName mrn gender dateOfBirth'
      )
      .populate(
        'orderingDoctorId',
        'firstName lastName role'
      )
      .populate(
        'radiologistId',
        'firstName lastName role'
      )
      .exec();
  }

  /**
   * Cancel a radiology order.
   *
   * Reported studies cannot be cancelled.
   */
  public async cancelOrder(
    orderId: string,
    hospitalId: string,
    cancellationReason: string
  ): Promise<IRadiologyOrderDocument | null> {
    return RadiologyOrderModel.findOneAndUpdate(
      {
        _id: orderId,
        hospitalId,
        status: {
          $nin: [
            RadiologyOrderStatus.REPORTED,
            RadiologyOrderStatus.CANCELLED,
          ],
        },
      },
      {
        $set: {
          status: RadiologyOrderStatus.CANCELLED,
          cancellationReason:
            cancellationReason?.trim() ||
            'No reason provided',
        },
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate(
        'patientId',
        'firstName lastName mrn gender dateOfBirth'
      )
      .populate(
        'orderingDoctorId',
        'firstName lastName role'
      )
      .populate(
        'radiologistId',
        'firstName lastName role'
      )
      .exec();
  }

  /**
   * Schedule an order.
   */
  public async scheduleOrder(
    orderId: string,
    hospitalId: string
  ): Promise<IRadiologyOrderDocument | null> {
    return RadiologyOrderModel.findOneAndUpdate(
      {
        _id: orderId,
        hospitalId,
        status: RadiologyOrderStatus.REQUESTED,
      },
      {
        $set: {
          status: RadiologyOrderStatus.SCHEDULED,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate(
        'patientId',
        'firstName lastName mrn gender dateOfBirth'
      )
      .populate(
        'orderingDoctorId',
        'firstName lastName role'
      )
      .populate(
        'radiologistId',
        'firstName lastName role'
      )
      .exec();
  }

  /**
   * Mark an examination as in progress.
   */
  public async startExamination(
    orderId: string,
    hospitalId: string
  ): Promise<IRadiologyOrderDocument | null> {
    return RadiologyOrderModel.findOneAndUpdate(
      {
        _id: orderId,
        hospitalId,
        status: {
          $in: [
            RadiologyOrderStatus.REQUESTED,
            RadiologyOrderStatus.SCHEDULED,
          ],
        },
      },
      {
        $set: {
          status: RadiologyOrderStatus.IN_PROGRESS,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate(
        'patientId',
        'firstName lastName mrn gender dateOfBirth'
      )
      .populate(
        'orderingDoctorId',
        'firstName lastName role'
      )
      .populate(
        'radiologistId',
        'firstName lastName role'
      )
      .exec();
  }

  /**
   * Assign a radiologist to an order.
   */
  public async assignRadiologist(
    orderId: string,
    hospitalId: string,
    radiologistId: string
  ): Promise<IRadiologyOrderDocument | null> {
    return RadiologyOrderModel.findOneAndUpdate(
      {
        _id: orderId,
        hospitalId,
      },
      {
        $set: {
          radiologistId,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate(
        'patientId',
        'firstName lastName mrn gender dateOfBirth'
      )
      .populate(
        'orderingDoctorId',
        'firstName lastName role'
      )
      .populate(
        'radiologistId',
        'firstName lastName role'
      )
      .exec();
  }
}

export const radiologyService = new RadiologyService();
