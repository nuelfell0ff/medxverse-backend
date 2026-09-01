import { radiologyService } from './radiology.service.js';
export class RadiologyController {
    async createOrder(req, res, next) {
        try {
            const authReq = req;
            const order = await radiologyService.createOrder({
                hospitalId: authReq.user.hospitalId,
                patientId: req.body.patientId,
                orderingDoctorId: req.body.orderingDoctorId ||
                    authReq.user._id,
                modality: req.body.modality,
                procedureName: req.body.procedureName,
                bodyPart: req.body.bodyPart,
                clinicalIndication: req.body.clinicalIndication,
                priority: req.body.priority,
                pricingCatalogueItemId: req.body.pricingCatalogueItemId,
                accessionNumber: req.body.accessionNumber,
                scheduling: req.body.scheduling,
                patientPreparation: req.body.patientPreparation,
                contrast: req.body.contrast,
                pregnancyScreening: req.body.pregnancyScreening,
            });
            res.status(201).json({
                success: true,
                data: order,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getPricingCatalogues(req, res, next) {
        try {
            const authReq = req;
            const catalogues = await radiologyService.getPricingCatalogues(authReq.user.hospitalId, typeof req.query.procedureName === 'string'
                ? req.query.procedureName
                : undefined);
            res.status(200).json({
                success: true,
                data: catalogues,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getOrders(req, res, next) {
        try {
            const authReq = req;
            const result = await radiologyService.getOrders(authReq.user.hospitalId, {
                page: req.query.page
                    ? Number(req.query.page)
                    : 1,
                limit: req.query.limit
                    ? Number(req.query.limit)
                    : 20,
                search: req.query.search,
                status: req.query.status,
                modality: req.query.modality,
                priority: req.query.priority,
                patientId: req.query.patientId,
                orderingDoctorId: req.query.orderingDoctorId,
                radiologistId: req.query.radiologistId,
                queueStatus: req.query.queueStatus,
                scheduledDate: req.query.scheduledDate,
            });
            res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getOrderById(req, res, next) {
        try {
            const authReq = req;
            const order = await radiologyService.getOrderById(req.params.id, authReq.user.hospitalId);
            if (!order) {
                res.status(404).json({
                    success: false,
                    message: 'Radiology order not found',
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: order,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateOrder(req, res, next) {
        try {
            const authReq = req;
            const updated = await radiologyService.updateOrder(req.params.id, authReq.user.hospitalId, req.body);
            if (!updated) {
                res.status(404).json({
                    success: false,
                    message: 'Radiology order not found or cannot be modified',
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async scheduleOrder(req, res, next) {
        try {
            const authReq = req;
            const updated = await radiologyService.scheduleOrder(req.params.id, authReq.user.hospitalId, {
                ...req.body,
                scheduledBy: authReq.user._id,
            });
            if (!updated) {
                res.status(404).json({
                    success: false,
                    message: 'Radiology order not found',
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async assignStaff(req, res, next) {
        try {
            const authReq = req;
            const updated = await radiologyService.assignStaff(req.params.id, authReq.user.hospitalId, {
                userId: req.body.userId,
                role: req.body.role,
                notes: req.body.notes,
            }, authReq.user._id);
            if (!updated) {
                res.status(404).json({
                    success: false,
                    message: 'Radiology order not found',
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async removeStaff(req, res, next) {
        try {
            const authReq = req;
            const updated = await radiologyService.removeStaff(req.params.id, authReq.user.hospitalId, req.body.userId, req.body.role);
            if (!updated) {
                res.status(404).json({
                    success: false,
                    message: 'Radiology order not found',
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateExaminationStatus(req, res, next) {
        try {
            const authReq = req;
            const updated = await radiologyService.updateExaminationStatus(req.params.id, authReq.user.hospitalId, {
                status: req.body.status,
                notes: req.body.notes,
            });
            if (!updated) {
                res.status(404).json({
                    success: false,
                    message: 'Radiology order not found',
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateQueue(req, res, next) {
        try {
            const authReq = req;
            const updated = await radiologyService.updateQueue(req.params.id, authReq.user.hospitalId, {
                queuePosition: req.body.queuePosition,
                queueStatus: req.body.queueStatus,
            });
            if (!updated) {
                res.status(404).json({
                    success: false,
                    message: 'Radiology order not found',
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updatePacsData(req, res, next) {
        try {
            const authReq = req;
            const updated = await radiologyService.updatePacsData(req.params.id, authReq.user.hospitalId, req.body);
            if (!updated) {
                res.status(404).json({
                    success: false,
                    message: 'Radiology order not found',
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateContrast(req, res, next) {
        try {
            const authReq = req;
            const updated = await radiologyService.updateContrast(req.params.id, authReq.user.hospitalId, {
                status: req.body.status,
                contrastName: req.body.contrastName,
                contrastType: req.body.contrastType,
                dose: req.body.dose,
                doseUnit: req.body.doseUnit,
                route: req.body.route,
                reactionObserved: req.body.reactionObserved,
                reactionDescription: req.body.reactionDescription,
                notes: req.body.notes,
            }, authReq.user._id);
            if (!updated) {
                res.status(404).json({
                    success: false,
                    message: 'Radiology order not found',
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updatePregnancyScreening(req, res, next) {
        try {
            const authReq = req;
            const updated = await radiologyService.updatePregnancyScreening(req.params.id, authReq.user.hospitalId, {
                status: req.body.status,
                testType: req.body.testType,
                testResult: req.body.testResult,
                notes: req.body.notes,
            }, authReq.user._id);
            if (!updated) {
                res.status(404).json({
                    success: false,
                    message: 'Radiology order not found',
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateRadiationExposure(req, res, next) {
        try {
            const authReq = req;
            const updated = await radiologyService.updateRadiationExposure(req.params.id, authReq.user.hospitalId, req.body, authReq.user._id);
            if (!updated) {
                res.status(404).json({
                    success: false,
                    message: 'Radiology order not found',
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async completeReport(req, res, next) {
        try {
            const authReq = req;
            const updated = await radiologyService.completeReport(req.params.id, authReq.user.hospitalId, {
                radiologistId: authReq.user._id,
                findings: req.body.findings,
                impression: req.body.impression,
                radiologistNotes: req.body.radiologistNotes,
                templateId: req.body.templateId,
                criticalResult: req.body.criticalResult,
            });
            if (!updated) {
                res.status(404).json({
                    success: false,
                    message: 'Radiology order not found',
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async signReport(req, res, next) {
        try {
            const authReq = req;
            const updated = await radiologyService.signReport(req.params.id, authReq.user.hospitalId, {
                radiologistId: authReq.user._id,
            });
            if (!updated) {
                res.status(404).json({
                    success: false,
                    message: 'Radiology report not found',
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async amendReport(req, res, next) {
        try {
            const authReq = req;
            const updated = await radiologyService.amendReport(req.params.id, authReq.user.hospitalId, {
                radiologistId: authReq.user._id,
                findings: req.body.findings,
                impression: req.body.impression,
                radiologistNotes: req.body.radiologistNotes,
                amendmentReason: req.body.amendmentReason,
            });
            if (!updated) {
                res.status(404).json({
                    success: false,
                    message: 'Radiology report not found',
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateCriticalResult(req, res, next) {
        try {
            const authReq = req;
            const updated = await radiologyService.updateCriticalResult(req.params.id, authReq.user.hospitalId, {
                status: req.body.status,
                finding: req.body.finding,
                notifiedUserId: req.body.notifiedUserId,
                notificationMethod: req.body.notificationMethod,
                notificationNotes: req.body.notificationNotes,
            });
            if (!updated) {
                res.status(404).json({
                    success: false,
                    message: 'Radiology order not found',
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateAIAnalysis(req, res, next) {
        try {
            const authReq = req;
            const updated = await radiologyService.updateAIAnalysis(req.params.id, authReq.user.hospitalId, {
                enabled: req.body.enabled,
                modelName: req.body.modelName,
                modelVersion: req.body.modelVersion,
                priority: req.body.priority,
                confidence: req.body.confidence,
                findings: req.body.findings,
                measurements: req.body.measurements,
                recommendations: req.body.recommendations,
                qualityPassed: req.body.qualityPassed,
                qualityNotes: req.body.qualityNotes,
            });
            if (!updated) {
                res.status(404).json({
                    success: false,
                    message: 'Radiology order not found',
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async captureBilling(req, res, next) {
        try {
            const authReq = req;
            const order = await radiologyService.captureBilling(req.params.id, authReq.user.hospitalId, authReq.user._id);
            if (!order) {
                res.status(404).json({
                    success: false,
                    message: 'Radiology order not found',
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: order,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async cancelOrder(req, res, next) {
        try {
            const authReq = req;
            const updated = await radiologyService.cancelOrder(req.params.id, authReq.user.hospitalId, req.body.cancellationReason ||
                'No reason provided');
            if (!updated) {
                res.status(404).json({
                    success: false,
                    message: 'Radiology order not found or cannot be cancelled',
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
export const radiologyController = new RadiologyController();
