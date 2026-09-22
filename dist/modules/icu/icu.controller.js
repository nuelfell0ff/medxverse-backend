import { icuService } from './icu.service.js';
const auth = (req) => req.user;
export class ICUController {
    async createAdmission(req, res, next) {
        try {
            const user = auth(req);
            const admission = await icuService.createAdmission(user.hospitalId, {
                patientId: req.body.patientId,
                wardId: req.body.wardId,
                bedNumber: req.body.bedNumber,
                careLevel: req.body.careLevel,
                primaryDiagnosis: req.body.primaryDiagnosis,
                admissionReason: req.body.admissionReason,
                attendingPhysicianId: req.body.attendingPhysicianId,
                admittedById: user._id,
                vitals: req.body.vitals,
                ventilatorSettings: req.body.ventilatorSettings
                    ? { ...req.body.ventilatorSettings, mode: req.body.ventilatorSettings.mode }
                    : undefined,
                sourceSurgeryCaseId: req.body.sourceSurgeryCaseId,
                encounterId: req.body.encounterId,
            });
            res.status(201).json({ success: true, data: admission });
        }
        catch (error) {
            next(error);
        }
    }
    async getAdmissions(req, res, next) {
        try {
            const user = auth(req);
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
            const result = await icuService.getAdmissions(user.hospitalId, {
                page,
                limit,
                status: req.query.status,
                careLevel: req.query.careLevel,
                patientId: req.query.patientId,
                wardId: req.query.wardId,
                bedNumber: req.query.bedNumber,
            });
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async getAdmissionById(req, res, next) {
        try {
            const user = auth(req);
            const admission = await icuService.getAdmissionById(req.params.id, user.hospitalId);
            if (!admission) {
                res.status(404).json({ success: false, message: 'ICU admission record not found.' });
                return;
            }
            res.status(200).json({ success: true, data: admission });
        }
        catch (error) {
            next(error);
        }
    }
    async getDashboard(req, res, next) {
        try {
            const user = auth(req);
            const dashboard = await icuService.getDashboard(user.hospitalId, req.params.id);
            res.status(200).json({ success: true, data: dashboard });
        }
        catch (error) {
            next(error);
        }
    }
    async updateVitals(req, res, next) {
        try {
            const user = auth(req);
            const updated = await icuService.updateVitals(req.params.id, user.hospitalId, user._id, { vitals: req.body.vitals });
            if (!updated) {
                res.status(404).json({ success: false, message: 'ICU admission record not found.' });
                return;
            }
            res.status(200).json({ success: true, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
    async updateVentilatorSettings(req, res, next) {
        try {
            const user = auth(req);
            const updated = await icuService.updateVentilatorSettings(req.params.id, user.hospitalId, user._id, {
                ventilatorSettings: {
                    ...req.body.ventilatorSettings,
                    mode: req.body.ventilatorSettings?.mode,
                },
            });
            if (!updated) {
                res.status(404).json({ success: false, message: 'ICU admission record not found.' });
                return;
            }
            res.status(200).json({ success: true, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
    async updateStatus(req, res, next) {
        try {
            const user = auth(req);
            const updated = await icuService.updateStatus(req.params.id, user.hospitalId, user._id, {
                status: req.body.status,
                dispositionNotes: req.body.dispositionNotes,
                transferredToWardId: req.body.transferredToWardId,
                dischargedAt: req.body.dischargedAt ? new Date(req.body.dischargedAt) : undefined,
            });
            if (!updated) {
                res.status(404).json({ success: false, message: 'ICU admission record not found.' });
                return;
            }
            res.status(200).json({ success: true, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
    async ingestDeviceReading(req, res, next) {
        try {
            const user = auth(req);
            const reading = await icuService.ingestDeviceReading(user.hospitalId, user._id, {
                ...req.body,
                deviceType: req.body.deviceType,
                protocol: req.body.protocol,
                quality: req.body.quality,
            });
            res.status(201).json({ success: true, data: reading });
        }
        catch (error) {
            next(error);
        }
    }
    async getDeviceReadings(req, res, next) {
        try {
            const user = auth(req);
            const readings = await icuService.getDeviceReadings(user.hospitalId, req.params.id, {
                from: req.query.from,
                to: req.query.to,
                deviceId: req.query.deviceId,
                parameter: req.query.parameter,
                limit: req.query.limit ? parseInt(req.query.limit, 10) : 1000,
            });
            res.status(200).json({ success: true, data: readings });
        }
        catch (error) {
            next(error);
        }
    }
    async getTrends(req, res, next) {
        try {
            const user = auth(req);
            const points = await icuService.getTrends(user.hospitalId, req.params.id, {
                parameter: req.query.parameter,
                from: req.query.from,
                to: req.query.to,
                deviceId: req.query.deviceId,
                limit: req.query.limit ? parseInt(req.query.limit, 10) : 5000,
            });
            res.status(200).json({ success: true, data: points });
        }
        catch (error) {
            next(error);
        }
    }
    async getFlowsheet(req, res, next) {
        try {
            const user = auth(req);
            const entries = await icuService.getFlowsheet(user.hospitalId, req.params.id, {
                from: req.query.from,
                to: req.query.to,
                parameter: req.query.parameter,
                status: req.query.status,
                limit: req.query.limit ? parseInt(req.query.limit, 10) : 1000,
            });
            res.status(200).json({ success: true, data: entries });
        }
        catch (error) {
            next(error);
        }
    }
    async addFlowsheetEntry(req, res, next) {
        try {
            const user = auth(req);
            const entry = await icuService.addFlowsheetEntry(user.hospitalId, user._id, {
                admissionId: req.params.id,
                recordedAt: req.body.recordedAt,
                category: req.body.category,
                parameter: req.body.parameter,
                value: req.body.value,
                unit: req.body.unit,
                source: req.body.source,
                sourceDeviceReadingId: req.body.sourceDeviceReadingId,
                annotation: req.body.annotation,
            });
            res.status(201).json({ success: true, data: entry });
        }
        catch (error) {
            next(error);
        }
    }
    async confirmFlowsheetEntry(req, res, next) {
        try {
            const user = auth(req);
            const entry = await icuService.confirmFlowsheetEntry(user.hospitalId, user._id, req.params.entryId, req.body.annotation);
            if (!entry) {
                res.status(404).json({ success: false, message: 'Flowsheet entry not found.' });
                return;
            }
            res.status(200).json({ success: true, data: entry });
        }
        catch (error) {
            next(error);
        }
    }
    async recalculateScores(req, res, next) {
        try {
            const user = auth(req);
            const scores = await icuService.recalculateScores(user.hospitalId, user._id, {
                admissionId: req.params.id,
                calculatedAt: req.body.calculatedAt,
                windowStart: req.body.windowStart,
                windowEnd: req.body.windowEnd,
                labs: req.body.labs,
                clinical: req.body.clinical,
            });
            res.status(201).json({ success: true, data: scores });
        }
        catch (error) {
            next(error);
        }
    }
    async recalculateScoresFromData(req, res, next) {
        try {
            const user = auth(req);
            const scores = await icuService.recalculateScoresFromUnderlyingData(user.hospitalId, user._id, req.params.id);
            res.status(201).json({ success: true, data: scores });
        }
        catch (error) {
            next(error);
        }
    }
    async getScores(req, res, next) {
        try {
            const user = auth(req);
            const scores = await icuService.getScores(user.hospitalId, req.params.id, req.query.scoreType);
            res.status(200).json({ success: true, data: scores });
        }
        catch (error) {
            next(error);
        }
    }
    async addFamilyCommunication(req, res, next) {
        try {
            const user = auth(req);
            const log = await icuService.addFamilyCommunication(user.hospitalId, user._id, {
                admissionId: req.params.id || req.body.admissionId,
                contactName: req.body.contactName,
                relationship: req.body.relationship,
                contactMethod: req.body.contactMethod,
                topics: req.body.topics || [],
                summary: req.body.summary,
                questionsOrConcerns: req.body.questionsOrConcerns,
                followUpRequired: req.body.followUpRequired,
                followUpPlan: req.body.followUpPlan,
            });
            res.status(201).json({ success: true, data: log });
        }
        catch (error) {
            next(error);
        }
    }
    async getFamilyCommunications(req, res, next) {
        try {
            const user = auth(req);
            const logs = await icuService.getFamilyCommunications(user.hospitalId, req.params.id);
            res.status(200).json({ success: true, data: logs });
        }
        catch (error) {
            next(error);
        }
    }
}
export const icuController = new ICUController();
