import { icuService } from './icu.service.js';
export class ICUController {
    async createAdmission(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const admittedById = authReq.user._id;
            const { patientId, bedNumber, careLevel, primaryDiagnosis, attendingPhysicianId, vitals, ventilatorSettings, } = req.body;
            const admission = await icuService.createAdmission({
                hospitalId,
                patientId,
                bedNumber,
                careLevel: careLevel,
                primaryDiagnosis,
                attendingPhysicianId,
                admittedById,
                vitals,
                ventilatorSettings,
            });
            res.status(201).json({ success: true, data: admission });
        }
        catch (error) {
            next(error);
        }
    }
    async getAdmissions(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
            const status = req.query.status;
            const careLevel = req.query.careLevel;
            const patientId = req.query.patientId;
            const bedNumber = req.query.bedNumber;
            const result = await icuService.getAdmissions(hospitalId, {
                page,
                limit,
                status,
                careLevel,
                patientId,
                bedNumber,
            });
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async getAdmissionById(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const id = req.params.id;
            const admission = await icuService.getAdmissionById(id, hospitalId);
            if (!admission) {
                res.status(404).json({ success: false, message: 'ICU admission record not found' });
                return;
            }
            res.status(200).json({ success: true, data: admission });
        }
        catch (error) {
            next(error);
        }
    }
    async updateVitals(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const id = req.params.id;
            const { vitals } = req.body;
            const updated = await icuService.updateVitals(id, hospitalId, { vitals });
            if (!updated) {
                res.status(404).json({ success: false, message: 'ICU admission record not found' });
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
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const id = req.params.id;
            const { ventilatorSettings } = req.body;
            const updated = await icuService.updateVentilatorSettings(id, hospitalId, {
                ventilatorSettings,
            });
            if (!updated) {
                res.status(404).json({ success: false, message: 'ICU admission record not found' });
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
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const id = req.params.id;
            const { status, dispositionNotes, transferredToWardId, dischargedAt } = req.body;
            const updated = await icuService.updateStatus(id, hospitalId, {
                status: status,
                dispositionNotes,
                transferredToWardId,
                dischargedAt: dischargedAt ? new Date(dischargedAt) : undefined,
            });
            if (!updated) {
                res.status(404).json({ success: false, message: 'ICU admission record not found' });
                return;
            }
            res.status(200).json({ success: true, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
}
export const icuController = new ICUController();
