import { Types } from 'mongoose';

import {
  LabOrderModel,
} from './lab.model.js';

import {
  CreateLabOrderDTO,
  RecordLabResultsDTO,
  RejectSampleDTO,
  GetLabOrdersQueryDTO,
  AmendResultsDTO,
  RepeatTestDTO,
  AccessionSpecimenDTO,
  ILabOrderDocument,
  LabOrderStatus,
  LabPriority,
  ResultFlag,
  EntryMethod,
  SampleRoutingStatus,
  AuthorizationLevel,
  SpecimenQuality,
} from './lab.types.js';

/* =========================================================
   HELPERS
========================================================= */

const ACCOUNT_SELECT = 'name email phone accountType';

/* =========================================================
   SERVICE
========================================================= */

export class LabService {
  /* =========================================================
     GENERATE UNIQUE ACCESSION NUMBER
  ========================================================= */

  private static async generateUniqueAccessionNumber(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const now = new Date();

      const year = now.getFullYear().toString().slice(-2);

      const month = String(
        now.getMonth() + 1
      ).padStart(2, '0');

      const day = String(
        now.getDate()
      ).padStart(2, '0');

      const timestamp = Date.now()
        .toString()
        .slice(-6);

      const random = Math.floor(
        100000 + Math.random() * 900000
      );

      const accessionNumber =
        `LAB-${year}${month}${day}-${timestamp}-${random}`;

      const existingOrder =
        await LabOrderModel.exists({
          accessionNumber,
        });

      if (!existingOrder) {
        return accessionNumber;
      }
    }

    const error = new Error(
      'Unable to generate a unique laboratory accession number. Please try again.'
    ) as Error & {
      statusCode?: number;
    };

    error.statusCode = 500;

    throw error;
  }

  /* =========================================================
     PREDICTED TURNAROUND TIME
  ========================================================= */

  private static getPredictedTatMinutes(
    priority?: LabPriority,
    isStat?: boolean
  ): number {
    if (
      isStat ||
      priority === LabPriority.STAT
    ) {
      return 30;
    }

    if (
      priority === LabPriority.URGENT
    ) {
      return 60;
    }

    return 120;
  }

  /* =========================================================
     POPULATE ORDER
  ========================================================= */

  private static async populateOrder(
    order: ILabOrderDocument
  ): Promise<ILabOrderDocument> {
    await order.populate([
      {
        path: 'patientId',
        select:
          'firstName lastName mrn dateOfBirth gender bloodGroup genotype',
      },
      {
        path: 'doctorId',
        select: ACCOUNT_SELECT,
      },
      {
        path: 'phlebotomistId',
        select: ACCOUNT_SELECT,
      },
      {
        path: 'labTechnicianId',
        select: ACCOUNT_SELECT,
      },
      {
        path: 'verifierId',
        select: ACCOUNT_SELECT,
      },
    ]);

    return order;
  }

  /* =========================================================
     CREATE ORDER
  ========================================================= */

  static async createOrder(
    hospitalId: string,
    requestingUserId: string,
    dto: CreateLabOrderDTO
  ): Promise<ILabOrderDocument> {
    if (
      !Types.ObjectId.isValid(hospitalId)
    ) {
      const error = new Error(
        'Invalid hospital ID.'
      ) as Error & {
        statusCode?: number;
      };

      error.statusCode = 400;

      throw error;
    }

    if (
      !Types.ObjectId.isValid(
        requestingUserId
      )
    ) {
      const error = new Error(
        'Invalid requesting user ID.'
      ) as Error & {
        statusCode?: number;
      };

      error.statusCode = 400;

      throw error;
    }

    if (
      !dto.patientId ||
      !Types.ObjectId.isValid(
        dto.patientId
      )
    ) {
      const error = new Error(
        'A valid patient must be selected.'
      ) as Error & {
        statusCode?: number;
      };

      error.statusCode = 400;

      throw error;
    }

    const doctorId =
      dto.doctorId || requestingUserId;

    if (
      !Types.ObjectId.isValid(
        doctorId
      )
    ) {
      const error = new Error(
        'Invalid doctor ID.'
      ) as Error & {
        statusCode?: number;
      };

      error.statusCode = 400;

      throw error;
    }

    if (
      !dto.testName?.trim()
    ) {
      const error = new Error(
        'Laboratory test name is required.'
      ) as Error & {
        statusCode?: number;
      };

      error.statusCode = 400;

      throw error;
    }

    if (!dto.testCategory) {
      const error = new Error(
        'Laboratory test category is required.'
      ) as Error & {
        statusCode?: number;
      };

      error.statusCode = 400;

      throw error;
    }

    if (
      !dto.sampleType?.trim()
    ) {
      const error = new Error(
        'Sample type is required.'
      ) as Error & {
        statusCode?: number;
      };

      error.statusCode = 400;

      throw error;
    }

    const priority =
      dto.priority ||
      (
        dto.isStat
          ? LabPriority.STAT
          : LabPriority.ROUTINE
      );

    const isStat =
      dto.isStat === true ||
      priority === LabPriority.STAT;

    const duplicateSince =
      new Date(
        Date.now() -
          24 * 60 * 60 * 1000
      );

    const existingDuplicate =
      await LabOrderModel.findOne({
        hospitalId:
          new Types.ObjectId(hospitalId),

        patientId:
          new Types.ObjectId(
            dto.patientId
          ),

        testName:
          dto.testName.trim(),

        status: {
          $nin: [
            LabOrderStatus.CANCELLED,
            LabOrderStatus.COMPLETED,
          ],
        },

        createdAt: {
          $gte: duplicateSince,
        },
      })
        .sort({
          createdAt: -1,
        })
        .select(
          'accessionNumber'
        );

    const duplicateTestDetected =
      Boolean(existingDuplicate);

    const duplicateTestMessage =
      existingDuplicate
        ? `A similar active test order already exists: ${existingDuplicate.accessionNumber}`
        : undefined;

    const initialStatus =
      dto.sampleCollectionScheduledAt
        ? LabOrderStatus.SAMPLE_SCHEDULED
        : LabOrderStatus.PENDING;

    const predictedTatMinutes =
      this.getPredictedTatMinutes(
        priority,
        isStat
      );

    /*
     * Retry the actual database creation.
     *
     * The pre-check inside generateUniqueAccessionNumber
     * prevents normal collisions, while this retry protects
     * against extremely rare simultaneous requests.
     */
    for (
      let attempt = 0;
      attempt < 5;
      attempt += 1
    ) {
      const accessionNumber =
        await this.generateUniqueAccessionNumber();

      const barcodeUrl =
        `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
          accessionNumber
        )}`;

      try {
        const order =
          await LabOrderModel.create({
            hospitalId:
              new Types.ObjectId(
                hospitalId
              ),

            patientId:
              new Types.ObjectId(
                dto.patientId
              ),

            doctorId:
              new Types.ObjectId(
                doctorId
              ),

            consultationId:
              dto.consultationId &&
              Types.ObjectId.isValid(
                dto.consultationId
              )
                ? new Types.ObjectId(
                    dto.consultationId
                  )
                : undefined,

            accessionNumber,

            barcodeUrl,

            qrCodeUrl:
              barcodeUrl,

            testCatalogId:
              dto.testCatalogId &&
              Types.ObjectId.isValid(
                dto.testCatalogId
              )
                ? new Types.ObjectId(
                    dto.testCatalogId
                  )
                : undefined,

            testName:
              dto.testName.trim(),

            testCategory:
              dto.testCategory,

            panelName:
              dto.panelName?.trim() ||
              undefined,

            priority,

            isStat,

            status:
              initialStatus,

            sampleType:
              dto.sampleType.trim(),

            sampleCollectionScheduledAt:
              dto.sampleCollectionScheduledAt
                ? new Date(
                    dto.sampleCollectionScheduledAt
                  )
                : undefined,

            sampleRouting: {
              department:
                dto.testCategory,

              status:
                SampleRoutingStatus.PENDING,
            },

            chainOfCustody: [
              {
                timestamp:
                  new Date(),

                action:
                  'ORDER_CREATED',

                performedBy:
                  new Types.ObjectId(
                    requestingUserId
                  ),

                notes:
                  'Electronic laboratory requisition created.',
              },
            ],

            predictedTatMinutes,

            duplicateTestDetected,

            duplicateTestMessage,

            notes:
              dto.notes?.trim() ||
              undefined,
          });

        return await this.populateOrder(
          order
        );
      } catch (error: unknown) {
        const mongoError =
          error as {
            code?: number;
            keyPattern?: Record<
              string,
              unknown
            >;
          };

        const isAccessionDuplicate =
          mongoError?.code === 11000 &&
          (
            mongoError
              .keyPattern
              ?.accessionNumber
          );

        if (
          isAccessionDuplicate &&
          attempt < 4
        ) {
          continue;
        }

        throw error;
      }
    }

    const error = new Error(
      'Unable to create laboratory order after generating multiple unique accession numbers.'
    ) as Error & {
      statusCode?: number;
    };

    error.statusCode = 500;

    throw error;
  }

  /* =========================================================
     GET ORDERS / WORKLIST
  ========================================================= */

  static async getOrders(
    hospitalId: string,
    query: GetLabOrdersQueryDTO
  ) {
    const page = Math.max(
      Number(query.page) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        Number(query.limit) || 20,
        1
      ),
      100
    );

    const skip =
      (page - 1) * limit;

    const filter:
      Record<string, unknown> = {
        hospitalId:
          new Types.ObjectId(
            hospitalId
          ),
      };

    if (
      query.patientId &&
      Types.ObjectId.isValid(
        query.patientId
      )
    ) {
      filter.patientId =
        new Types.ObjectId(
          query.patientId
        );
    }

    if (
      query.doctorId &&
      Types.ObjectId.isValid(
        query.doctorId
      )
    ) {
      filter.doctorId =
        new Types.ObjectId(
          query.doctorId
        );
    }

    if (query.status) {
      filter.status =
        query.status;
    }

    if (query.priority) {
      filter.priority =
        query.priority;
    }

    if (query.department) {
      filter.testCategory =
        query.department;
    }

    if (
      query.accessionNumber
    ) {
      filter.accessionNumber = {
        $regex:
          query.accessionNumber,
        $options: 'i',
      };
    }

    if (
      query.isStat !==
      undefined
    ) {
      filter.isStat =
        String(
          query.isStat
        ) === 'true';
    }

    const [orders, total] =
      await Promise.all([
        LabOrderModel.find(filter)
          .populate(
            'patientId',
            'firstName lastName mrn dateOfBirth gender'
          )
          .populate(
            'doctorId',
            ACCOUNT_SELECT
          )
          .populate(
            'phlebotomistId',
            ACCOUNT_SELECT
          )
          .populate(
            'labTechnicianId',
            ACCOUNT_SELECT
          )
          .populate(
            'verifierId',
            ACCOUNT_SELECT
          )
          .sort({
            isStat: -1,
            priority: -1,
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit),

        LabOrderModel.countDocuments(
          filter
        ),
      ]);

    return {
      orders,
      total,
      page,
      limit,
      pages:
        Math.ceil(
          total / limit
        ),
    };
  }

  /* =========================================================
     GET SINGLE ORDER
  ========================================================= */

  static async getOrderById(
    hospitalId: string,
    orderId: string
  ): Promise<ILabOrderDocument> {
    if (
      !Types.ObjectId.isValid(
        orderId
      )
    ) {
      const error = new Error(
        'Invalid laboratory order ID.'
      ) as Error & {
        statusCode?: number;
      };

      error.statusCode = 400;

      throw error;
    }

    const order =
      await LabOrderModel.findOne({
        _id:
          new Types.ObjectId(
            orderId
          ),

        hospitalId:
          new Types.ObjectId(
            hospitalId
          ),
      });

    if (!order) {
      const error = new Error(
        'Laboratory order not found.'
      ) as Error & {
        statusCode?: number;
      };

      error.statusCode = 404;

      throw error;
    }

    return this.populateOrder(
      order
    );
  }

  /* =========================================================
     SAMPLE COLLECTION
  ========================================================= */

  static async collectSample(
    hospitalId: string,
    orderId: string,
    phlebotomistId: string
  ): Promise<ILabOrderDocument> {
    const order =
      await this.getOrderById(
        hospitalId,
        orderId
      );

    if (
      [
        LabOrderStatus.CANCELLED,
        LabOrderStatus.COMPLETED,
      ].includes(order.status)
    ) {
      const error = new Error(
        'Sample cannot be collected for this order.'
      ) as Error & {
        statusCode?: number;
      };

      error.statusCode = 400;

      throw error;
    }

    const now = new Date();

    order.status =
      LabOrderStatus.SAMPLE_COLLECTED;

    order.phlebotomistId =
      new Types.ObjectId(
        phlebotomistId
      );

    order.sampleCollectedAt =
      now;

    order.chainOfCustody.push({
      timestamp: now,

      action:
        'SAMPLE_COLLECTED',

      performedBy:
        new Types.ObjectId(
          phlebotomistId
        ),

      notes:
        'Specimen collected and linked to accession number.',
    });

    await order.save();

    return this.populateOrder(
      order
    );
  }

  /* =========================================================
     SPECIMEN ACCESSIONING
  ========================================================= */

  static async accessionSpecimen(
    hospitalId: string,
    orderId: string,
    technicianId: string,
    dto: AccessionSpecimenDTO
  ): Promise<ILabOrderDocument> {
    const order =
      await this.getOrderById(
        hospitalId,
        orderId
      );

    const now = new Date();

    order.status =
      LabOrderStatus.SPECIMEN_RECEIVED;

    order.specimenReceivedAt =
      now;

    order.labTechnicianId =
      new Types.ObjectId(
        technicianId
      );

    if (
      !order.sampleRouting
    ) {
      order.sampleRouting = {
        department:
          order.testCategory,

        status:
          SampleRoutingStatus.PENDING,
      };
    }

    order.sampleRouting.department =
      order.testCategory;

    order.sampleRouting.routedAt =
      now;

    order.sampleRouting.routedBy =
      new Types.ObjectId(
        technicianId
      );

    order.sampleRouting.location =
      dto.location ||
      'Central Laboratory';

    order.sampleRouting.status =
      SampleRoutingStatus.ROUTED;

    order.chainOfCustody.push({
      timestamp: now,

      action:
        'SPECIMEN_ACCESSIONED_AND_ROUTED',

      performedBy:
        new Types.ObjectId(
          technicianId
        ),

      location:
        dto.location ||
        'Central Laboratory',

      notes:
        `Specimen accessioned and routed to ${order.testCategory}.`,
    });

    await order.save();

    return this.populateOrder(
      order
    );
  }

  /* =========================================================
     REJECT SAMPLE
  ========================================================= */

  static async rejectSample(
    hospitalId: string,
    orderId: string,
    technicianId: string,
    dto: RejectSampleDTO
  ): Promise<ILabOrderDocument> {
    const order =
      await this.getOrderById(
        hospitalId,
        orderId
      );

    const now = new Date();

    order.status =
      dto.requestRecollection
        ? LabOrderStatus.RECOLLECTION_REQUIRED
        : LabOrderStatus.SAMPLE_REJECTED;

    order.specimenQuality =
      dto.quality;

    order.rejectionInfo = {
      rejectedBy:
        new Types.ObjectId(
          technicianId
        ),

      reason:
        dto.reason,

      quality:
        dto.quality,

      rejectionDate:
        now,

      recollectionRequested:
        dto.requestRecollection,

      recollectionScheduledAt:
        dto.recollectionScheduledAt
          ? new Date(
              dto.recollectionScheduledAt
            )
          : undefined,
    };

    order.chainOfCustody.push({
      timestamp: now,

      action:
        'SAMPLE_REJECTED',

      performedBy:
        new Types.ObjectId(
          technicianId
        ),

      notes:
        `Reason: ${dto.reason}`,
    });

    if (
      dto.requestRecollection
    ) {
      order.chainOfCustody.push({
        timestamp: now,

        action:
          'RECOLLECTION_REQUESTED',

        performedBy:
          new Types.ObjectId(
            technicianId
          ),

        notes:
          'A new specimen collection is required.',
      });
    }

    await order.save();

    return this.populateOrder(
      order
    );
  }

  /* =========================================================
     RECOLLECT SAMPLE
  ========================================================= */

  static async recollectSample(
    hospitalId: string,
    orderId: string,
    phlebotomistId: string
  ): Promise<ILabOrderDocument> {
    const order =
      await this.getOrderById(
        hospitalId,
        orderId
      );

    if (
      order.status !==
      LabOrderStatus.RECOLLECTION_REQUIRED
    ) {
      const error = new Error(
        'This order does not currently require recollection.'
      ) as Error & {
        statusCode?: number;
      };

      error.statusCode = 400;

      throw error;
    }

    const now = new Date();

    order.status =
      LabOrderStatus.SAMPLE_COLLECTED;

    order.sampleCollectedAt =
      now;

    order.phlebotomistId =
      new Types.ObjectId(
        phlebotomistId
      );

    order.specimenQuality =
      SpecimenQuality.SATISFACTORY;

    order.rejectionInfo =
      undefined;

    order.chainOfCustody.push({
      timestamp: now,

      action:
        'SAMPLE_RECOLLECTED',

      performedBy:
        new Types.ObjectId(
          phlebotomistId
        ),

      notes:
        'Replacement specimen collected successfully.',
    });

    await order.save();

    return this.populateOrder(
      order
    );
  }

  /* =========================================================
     RECORD RESULTS
  ========================================================= */

  static async recordResults(
    hospitalId: string,
    orderId: string,
    technicianId: string,
    dto: RecordLabResultsDTO
  ): Promise<ILabOrderDocument> {
    const order =
      await this.getOrderById(
        hospitalId,
        orderId
      );

    const evaluatedResults =
      dto.results.map(
        (result) => {
          let flag =
            result.flag ||
            ResultFlag.NORMAL;

          const numericValue =
            Number(
              result.value
            );

          if (
            result.value &&
            !Number.isNaN(
              numericValue
            )
          ) {
            const parameter =
              result.parameterName.toLowerCase();

            if (
              parameter.includes(
                'glucose'
              ) &&
              (
                numericValue >
                  300 ||
                numericValue <
                  50
              )
            ) {
              flag =
                ResultFlag.CRITICAL;
            }
          }

          return {
            ...result,

            flag,

            entryMethod:
              result.entryMethod ||
              EntryMethod.MANUAL,
          };
        }
      );

    const hasCritical =
      evaluatedResults.some(
        (result) =>
          result.flag ===
          ResultFlag.CRITICAL
      );

    const hasAbnormal =
      evaluatedResults.some(
        (result) =>
          result.flag ===
            ResultFlag.ABNORMAL ||
          result.flag ===
            ResultFlag.DELTA_CHECK_WARNING
      );

    order.results =
      evaluatedResults;

    order.specimenQuality =
      dto.specimenQuality ||
      order.specimenQuality ||
      SpecimenQuality.SATISFACTORY;

    order.labTechnicianId =
      new Types.ObjectId(
        technicianId
      );

    order.status =
      LabOrderStatus.RESULTS_RECORDED;

    if (hasCritical) {
      order.criticalResultNotified =
        true;

      order.aiPatternAlerts.push(
        'CRITICAL RESULT ALERT: Critical laboratory value detected. Immediate clinical review is required.'
      );
    }

    if (hasAbnormal) {
      order.aiPatternAlerts.push(
        'ABNORMAL RESULT FLAG: One or more laboratory values require clinical review.'
      );
    }

    if (dto.notes) {
      order.notes =
        dto.notes;
    }

    order.chainOfCustody.push({
      timestamp:
        new Date(),

      action:
        'RESULTS_RECORDED',

      performedBy:
        new Types.ObjectId(
          technicianId
        ),

      notes:
        'Laboratory results entered into the LIS.',
    });

    await order.save();

    return this.populateOrder(
      order
    );
  }

  /* =========================================================
     VERIFY RESULTS
  ========================================================= */

  static async verifyResults(
    hospitalId: string,
    orderId: string,
    verifierId: string
  ): Promise<ILabOrderDocument> {
    const order =
      await this.getOrderById(
        hospitalId,
        orderId
      );

    if (
      !order.results.length
    ) {
      const error = new Error(
        'Results must be recorded before verification.'
      ) as Error & {
        statusCode?: number;
      };

      error.statusCode = 400;

      throw error;
    }

    const now = new Date();

    order.status =
      LabOrderStatus.VERIFIED;

    order.verifierId =
      new Types.ObjectId(
        verifierId
      );

    order.verifiedAt =
      now;

    order.authorizationHistory.push({
      level:
        AuthorizationLevel.VERIFIER,

      authorizedBy:
        new Types.ObjectId(
          verifierId
        ),

      authorizedAt:
        now,

      notes:
        'Results verified successfully.',
    });

    order.chainOfCustody.push({
      timestamp: now,

      action:
        'RESULTS_VERIFIED',

      performedBy:
        new Types.ObjectId(
          verifierId
        ),

      notes:
        'Results passed verification.',
    });

    await order.save();

    return this.populateOrder(
      order
    );
  }

  /* =========================================================
     AUTHORIZE / RELEASE RESULTS
  ========================================================= */

  static async authorizeResults(
    hospitalId: string,
    orderId: string,
    authorizerId: string
  ): Promise<ILabOrderDocument> {
    const order =
      await this.getOrderById(
        hospitalId,
        orderId
      );

    if (
      order.status !==
        LabOrderStatus.VERIFIED &&
      order.status !==
        LabOrderStatus.RESULTS_RECORDED
    ) {
      const error = new Error(
        'Results must be recorded or verified before authorization.'
      ) as Error & {
        statusCode?: number;
      };

      error.statusCode = 400;

      throw error;
    }

    const now = new Date();

    order.status =
      LabOrderStatus.COMPLETED;

    order.authorizedAt =
      now;

    order.completedAt =
      now;

    order.authorizationHistory.push({
      level:
        AuthorizationLevel.SENIOR_SCIENTIST,

      authorizedBy:
        new Types.ObjectId(
          authorizerId
        ),

      authorizedAt:
        now,

      notes:
        'Results authorized and released.',
    });

    order.chainOfCustody.push({
      timestamp: now,

      action:
        'RESULTS_AUTHORIZED_AND_RELEASED',

      performedBy:
        new Types.ObjectId(
          authorizerId
        ),

      notes:
        'Final laboratory results released.',
    });

    await order.save();

    return this.populateOrder(
      order
    );
  }

  /* =========================================================
     AMEND RESULTS
  ========================================================= */

  static async amendResults(
    hospitalId: string,
    orderId: string,
    amendedBy: string,
    dto: AmendResultsDTO
  ): Promise<ILabOrderDocument> {
    const order =
      await this.getOrderById(
        hospitalId,
        orderId
      );

    if (
      !dto.reason?.trim()
    ) {
      const error = new Error(
        'An amendment reason is required.'
      ) as Error & {
        statusCode?: number;
      };

      error.statusCode = 400;

      throw error;
    }

    const previousResults =
      order.results.map(
        (result) => ({
          parameterName:
            result.parameterName,

          value:
            result.value,

          unit:
            result.unit,

          referenceRange:
            result.referenceRange,

          ageSexSpecificRange:
            result.ageSexSpecificRange,

          flag:
            result.flag,

          previousValue:
            result.previousValue,

          deltaPercentage:
            result.deltaPercentage,

          entryMethod:
            result.entryMethod,

          analyzerName:
            result.analyzerName,

          analyzerResultId:
            result.analyzerResultId,

          isRepeat:
            result.isRepeat,

          repeatReason:
            result.repeatReason,

          dilutionFactor:
            result.dilutionFactor,
        })
      );

    order.version += 1;

    order.results =
      dto.results.map(
        (result) => ({
          ...result,

          entryMethod:
            result.entryMethod ||
            EntryMethod.MANUAL,
        })
      );

    order.amendmentHistory.push({
      amendedBy:
        new Types.ObjectId(
          amendedBy
        ),

      amendedAt:
        new Date(),

      reason:
        dto.reason,

      previousResults,

      newResults:
        dto.results,

      version:
        order.version,
    });

    order.status =
      LabOrderStatus.RESULTS_RECORDED;

    if (dto.notes) {
      order.notes =
        dto.notes;
    }

    order.chainOfCustody.push({
      timestamp:
        new Date(),

      action:
        'RESULTS_AMENDED',

      performedBy:
        new Types.ObjectId(
          amendedBy
        ),

      notes:
        `Version ${order.version}: ${dto.reason}`,
    });

    await order.save();

    return this.populateOrder(
      order
    );
  }

  /* =========================================================
     REPEAT TEST
  ========================================================= */

  static async repeatTest(
    hospitalId: string,
    orderId: string,
    technicianId: string,
    dto: RepeatTestDTO
  ): Promise<ILabOrderDocument> {
    const order =
      await this.getOrderById(
        hospitalId,
        orderId
      );

    const now = new Date();

    order.repeatTests.push({
      repeatedAt:
        now,

      repeatedBy:
        new Types.ObjectId(
          technicianId
        ),

      reason:
        dto.reason,

      parameterNames:
        dto.parameterNames || [],

      dilutionFactor:
        dto.dilutionFactor,

      notes:
        dto.notes,
    });

    order.status =
      LabOrderStatus.IN_PROGRESS;

    order.chainOfCustody.push({
      timestamp:
        now,

      action:
        'TEST_REPEAT_REQUESTED',

      performedBy:
        new Types.ObjectId(
          technicianId
        ),

      notes:
        dto.reason,
    });

    await order.save();

    return this.populateOrder(
      order
    );
  }
}