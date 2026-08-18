import { Types } from 'mongoose';
import { RadiologyOrderModel } from './radiology.model.js';
import { AssignmentRole, ExaminationQueueStatus, RadiologyOrderStatus, ReportStatus, CriticalResultStatus, } from './radiology.types.js';
const isValidObjectId = (value) => Types.ObjectId.isValid(value);
export class RadiologyService {
    assertObjectId(value, fieldName) {
        if (!isValidObjectId(value)) {
            throw new Error(`Invalid ${fieldName}`);
        }
    }
    generateAccessionNumber() {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 7).toUpperCase();
        return `RAD-${timestamp}-${random}`;
    }
    async createOrder(input) {
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
        const accessionNumber = input.accessionNumber?.trim() || this.generateAccessionNumber();
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
    async getOrders(hospitalId, query) {
        this.assertObjectId(hospitalId, 'hospital ID');
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
        const skip = (page - 1) * limit;
        const filter = {
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
            this.assertObjectId(query.orderingDoctorId, 'ordering doctor ID');
            filter.orderingDoctorId = query.orderingDoctorId;
        }
        if (query.radiologistId) {
            this.assertObjectId(query.radiologistId, 'radiologist ID');
            filter.radiologistId = query.radiologistId;
        }
        if (query.queueStatus) {
            filter.queueStatus = query.queueStatus;
        }
        if (query.scheduledDate) {
            const start = new Date(`${query.scheduledDate}T00:00:00`);
            const end = new Date(`${query.scheduledDate}T23:59:59.999`);
            if (!Number.isNaN(start.getTime()) &&
                !Number.isNaN(end.getTime())) {
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
                .populate('patientId', 'firstName lastName mrn gender dateOfBirth')
                .populate('orderingDoctorId', 'firstName lastName role department')
                .populate('radiologistId', 'firstName lastName role department')
                .populate('assignments.userId', 'firstName lastName role department')
                .populate('assignments.assignedBy', 'firstName lastName role')
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
    async getOrderById(orderId, hospitalId) {
        this.assertObjectId(orderId, 'order ID');
        this.assertObjectId(hospitalId, 'hospital ID');
        return RadiologyOrderModel.findOne({
            _id: orderId,
            hospitalId,
        })
            .populate('patientId', 'firstName lastName mrn gender dateOfBirth phone email')
            .populate('orderingDoctorId', 'firstName lastName role department')
            .populate('radiologistId', 'firstName lastName role department')
            .populate('assignments.userId', 'firstName lastName role department')
            .populate('assignments.assignedBy', 'firstName lastName role')
            .populate('scheduling.modalityId', 'name modality manufacturer model status')
            .exec();
    }
    async updateOrder(orderId, hospitalId, input) {
        this.assertObjectId(orderId, 'order ID');
        this.assertObjectId(hospitalId, 'hospital ID');
        const update = {};
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
            Object.entries(input.scheduling).forEach(([key, value]) => {
                update[`scheduling.${key}`] = value;
            });
        }
        if (input.patientPreparation !== undefined) {
            update.patientPreparation = input.patientPreparation;
        }
        return RadiologyOrderModel.findOneAndUpdate({
            _id: orderId,
            hospitalId,
            status: {
                $nin: [
                    RadiologyOrderStatus.COMPLETED,
                    RadiologyOrderStatus.CANCELLED,
                ],
            },
        }, {
            $set: update,
        }, {
            new: true,
            runValidators: true,
        }).exec();
    }
    async scheduleOrder(orderId, hospitalId, scheduling) {
        this.assertObjectId(orderId, 'order ID');
        this.assertObjectId(hospitalId, 'hospital ID');
        this.assertObjectId(scheduling.scheduledBy, 'scheduled by user ID');
        if (scheduling.modalityId) {
            this.assertObjectId(scheduling.modalityId, 'modality ID');
        }
        const scheduledDate = new Date(scheduling.scheduledDate);
        if (Number.isNaN(scheduledDate.getTime())) {
            throw new Error('Invalid scheduled date');
        }
        return RadiologyOrderModel.findOneAndUpdate({
            _id: orderId,
            hospitalId,
            status: {
                $nin: [
                    RadiologyOrderStatus.COMPLETED,
                    RadiologyOrderStatus.CANCELLED,
                ],
            },
        }, {
            $set: {
                scheduling: {
                    ...scheduling,
                    scheduledDate,
                    scheduledBy: scheduling.scheduledBy,
                },
                status: RadiologyOrderStatus.SCHEDULED,
            },
        }, {
            new: true,
            runValidators: true,
        }).exec();
    }
    async assignStaff(orderId, hospitalId, input, assignedBy) {
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
        const assignments = order.assignments || [];
        const existingIndex = assignments.findIndex((assignment) => String(assignment.userId) === input.userId &&
            assignment.role === input.role);
        if (existingIndex >= 0) {
            assignments[existingIndex].notes = input.notes;
        }
        else {
            assignments.push({
                userId: new Types.ObjectId(input.userId),
                role: input.role,
                assignedAt: new Date(),
                assignedBy: new Types.ObjectId(assignedBy),
                notes: input.notes,
            });
        }
        if (input.role === AssignmentRole.RADIOLOGIST) {
            order.radiologistId = new Types.ObjectId(input.userId);
        }
        order.assignments = assignments;
        await order.save();
        return order;
    }
    async removeStaff(orderId, hospitalId, userId, role) {
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
        order.assignments = (order.assignments || []).filter((assignment) => !(String(assignment.userId) === userId &&
            assignment.role === role));
        if (role === AssignmentRole.RADIOLOGIST &&
            String(order.radiologistId || '') === userId) {
            order.radiologistId = undefined;
        }
        await order.save();
        return order;
    }
    async updateExaminationStatus(orderId, hospitalId, input) {
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
        return order;
    }
    async updateQueue(orderId, hospitalId, input) {
        this.assertObjectId(orderId, 'order ID');
        this.assertObjectId(hospitalId, 'hospital ID');
        const update = {};
        if (input.queuePosition !== undefined) {
            if (input.queuePosition < 1) {
                throw new Error('Queue position must be at least 1');
            }
            update.queuePosition = input.queuePosition;
        }
        if (input.queueStatus !== undefined) {
            update.queueStatus = input.queueStatus;
            if (input.queueStatus === ExaminationQueueStatus.WAITING) {
                update.status = RadiologyOrderStatus.REQUESTED;
            }
            if (input.queueStatus === ExaminationQueueStatus.IN_PROGRESS) {
                update.status = RadiologyOrderStatus.IN_PROGRESS;
            }
            if (input.queueStatus === ExaminationQueueStatus.COMPLETED) {
                update.status = RadiologyOrderStatus.COMPLETED;
            }
            if (input.queueStatus === ExaminationQueueStatus.CANCELLED) {
                update.status = RadiologyOrderStatus.CANCELLED;
            }
        }
        return RadiologyOrderModel.findOneAndUpdate({
            _id: orderId,
            hospitalId,
        }, {
            $set: update,
        }, {
            new: true,
            runValidators: true,
        }).exec();
    }
    async updatePacsData(orderId, hospitalId, input) {
        this.assertObjectId(orderId, 'order ID');
        this.assertObjectId(hospitalId, 'hospital ID');
        const update = {};
        Object.entries(input).forEach(([key, value]) => {
            if (value !== undefined) {
                update[`pacsMetadata.${key}`] =
                    value instanceof Date
                        ? value
                        : key === 'studyDate' || key === 'sharedLinkExpiresAt'
                            ? new Date(value)
                            : value;
            }
        });
        update['pacsMetadata.modality'] =
            input.modality;
        const order = await RadiologyOrderModel.findOneAndUpdate({
            _id: orderId,
            hospitalId,
        }, {
            $set: update,
        }, {
            new: true,
            runValidators: true,
        }).exec();
        return order;
    }
    async updateContrast(orderId, hospitalId, input, administeredBy) {
        this.assertObjectId(orderId, 'order ID');
        this.assertObjectId(hospitalId, 'hospital ID');
        if (administeredBy) {
            this.assertObjectId(administeredBy, 'administered by user ID');
        }
        const contrast = {
            ...input,
        };
        if (input.status === 'ADMINISTERED') {
            contrast.administeredAt = new Date();
            if (administeredBy) {
                contrast.administeredBy = administeredBy;
            }
        }
        return RadiologyOrderModel.findOneAndUpdate({
            _id: orderId,
            hospitalId,
        }, {
            $set: {
                contrast,
            },
        }, {
            new: true,
            runValidators: true,
        }).exec();
    }
    async updatePregnancyScreening(orderId, hospitalId, input, screenedBy) {
        this.assertObjectId(orderId, 'order ID');
        this.assertObjectId(hospitalId, 'hospital ID');
        this.assertObjectId(screenedBy, 'screened by user ID');
        return RadiologyOrderModel.findOneAndUpdate({
            _id: orderId,
            hospitalId,
        }, {
            $set: {
                pregnancyScreening: {
                    ...input,
                    screenedAt: new Date(),
                    screenedBy,
                },
            },
        }, {
            new: true,
            runValidators: true,
        }).exec();
    }
    async updateRadiationExposure(orderId, hospitalId, input, recordedBy) {
        this.assertObjectId(orderId, 'order ID');
        this.assertObjectId(hospitalId, 'hospital ID');
        this.assertObjectId(recordedBy, 'recorded by user ID');
        return RadiologyOrderModel.findOneAndUpdate({
            _id: orderId,
            hospitalId,
        }, {
            $set: {
                radiationExposure: {
                    ...input,
                    recordedAt: new Date(),
                    recordedBy,
                },
            },
        }, {
            new: true,
            runValidators: true,
        }).exec();
    }
    async completeReport(orderId, hospitalId, input) {
        this.assertObjectId(orderId, 'order ID');
        this.assertObjectId(hospitalId, 'hospital ID');
        this.assertObjectId(input.radiologistId, 'radiologist ID');
        if (!input.findings?.trim()) {
            throw new Error('Findings are required');
        }
        if (!input.impression?.trim()) {
            throw new Error('Impression is required');
        }
        const order = await RadiologyOrderModel.findOne({
            _id: orderId,
            hospitalId,
        });
        if (!order) {
            return null;
        }
        const now = new Date();
        if (!order.report) {
            order.report = {
                status: ReportStatus.DRAFT,
                findings: input.findings,
                impression: input.impression,
                radiologistNotes: input.radiologistNotes,
                templateId: input.templateId,
                version: 1,
                draftedAt: now,
                criticalResult: {
                    status: input.criticalResult?.status ||
                        CriticalResultStatus.NOT_APPLICABLE,
                    ...input.criticalResult,
                },
                versions: [],
            };
        }
        else {
            const nextVersion = (order.report.version || 0) + 1;
            order.report.version = nextVersion;
            order.report.findings = input.findings;
            order.report.impression = input.impression;
            order.report.radiologistNotes =
                input.radiologistNotes;
            order.report.templateId = input.templateId;
            order.report.draftedAt = now;
            if (input.criticalResult) {
                order.report.criticalResult = {
                    ...(order.report.criticalResult || {}),
                    ...input.criticalResult,
                };
            }
        }
        order.radiologistId = new Types.ObjectId(input.radiologistId);
        // Keep legacy fields synchronized.
        order.findings = input.findings;
        order.impression = input.impression;
        order.radiologistNotes =
            input.radiologistNotes;
        order.status = RadiologyOrderStatus.REPORTING;
        await order.save();
        return order;
    }
    async signReport(orderId, hospitalId, input) {
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
            throw new Error('A report must contain findings and impression before signing');
        }
        const now = new Date();
        order.report.status = ReportStatus.FINAL;
        order.report.signedAt = now;
        order.report.signedBy = new Types.ObjectId(input.radiologistId);
        order.report.versions =
            order.report.versions || [];
        order.report.versions.push({
            version: order.report.version || 1,
            findings: order.report.findings,
            impression: order.report.impression,
            radiologistNotes: order.report.radiologistNotes,
            status: ReportStatus.FINAL,
            createdBy: new Types.ObjectId(input.radiologistId),
            createdAt: now,
            signedAt: now,
        });
        order.status = RadiologyOrderStatus.REPORTED;
        order.reportedAt = now;
        if (order.procedureTracking) {
            order.procedureTracking.reportedAt = now;
        }
        await order.save();
        return order;
    }
    async amendReport(orderId, hospitalId, input) {
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
            radiologistNotes: order.report.radiologistNotes,
            status: order.report.status || ReportStatus.FINAL,
            createdBy: new Types.ObjectId(input.radiologistId),
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
    async updateCriticalResult(orderId, hospitalId, criticalResult) {
        this.assertObjectId(orderId, 'order ID');
        this.assertObjectId(hospitalId, 'hospital ID');
        if (criticalResult.notifiedUserId) {
            this.assertObjectId(criticalResult.notifiedUserId, 'notified user ID');
        }
        const update = {
            'report.criticalResult.status': criticalResult.status,
            'report.criticalResult.finding': criticalResult.finding,
            'report.criticalResult.notificationMethod': criticalResult.notificationMethod,
            'report.criticalResult.notificationNotes': criticalResult.notificationNotes,
        };
        if (criticalResult.status ===
            CriticalResultStatus.NOTIFIED) {
            update['report.criticalResult.notifiedAt'] =
                new Date();
            update['report.criticalResult.notifiedUserId'] =
                criticalResult.notifiedUserId;
        }
        if (criticalResult.status ===
            CriticalResultStatus.ACKNOWLEDGED) {
            update['report.criticalResult.acknowledgedAt'] =
                new Date();
        }
        return RadiologyOrderModel.findOneAndUpdate({
            _id: orderId,
            hospitalId,
        }, {
            $set: update,
        }, {
            new: true,
            runValidators: true,
        }).exec();
    }
    async updateAIAnalysis(orderId, hospitalId, input) {
        this.assertObjectId(orderId, 'order ID');
        this.assertObjectId(hospitalId, 'hospital ID');
        if (input.confidence !== undefined &&
            (input.confidence < 0 ||
                input.confidence > 1)) {
            throw new Error('AI confidence must be between 0 and 1');
        }
        return RadiologyOrderModel.findOneAndUpdate({
            _id: orderId,
            hospitalId,
        }, {
            $set: {
                aiAnalysis: {
                    ...input,
                    processedAt: new Date(),
                },
            },
        }, {
            new: true,
            runValidators: true,
        }).exec();
    }
    async cancelOrder(orderId, hospitalId, cancellationReason) {
        this.assertObjectId(orderId, 'order ID');
        this.assertObjectId(hospitalId, 'hospital ID');
        if (!cancellationReason?.trim()) {
            throw new Error('Cancellation reason is required');
        }
        return RadiologyOrderModel.findOneAndUpdate({
            _id: orderId,
            hospitalId,
            status: {
                $nin: [
                    RadiologyOrderStatus.COMPLETED,
                    RadiologyOrderStatus.REPORTED,
                    RadiologyOrderStatus.CANCELLED,
                ],
            },
        }, {
            $set: {
                status: RadiologyOrderStatus.CANCELLED,
                cancellationReason: cancellationReason.trim(),
                queueStatus: ExaminationQueueStatus.CANCELLED,
            },
        }, {
            new: true,
            runValidators: true,
        }).exec();
    }
}
export const radiologyService = new RadiologyService();
