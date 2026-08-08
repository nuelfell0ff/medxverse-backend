import { outpatientService } from './outpatient.service.js';
export class OutpatientController {
    async createEncounter(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const { patientId, doctorId, departmentId, triagePriority, chiefComplaint } = req.body;
            const encounter = await outpatientService.createEncounter({
                hospitalId,
                patientId,
                doctorId,
                departmentId,
                triagePriority: triagePriority,
                chiefComplaint,
            });
            res.status(201).json({ success: true, data: encounter });
        }
        catch (error) {
            next(error);
        }
    }
    async getQueue(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
            const status = req.query.status;
            const doctorId = req.query.doctorId;
            const triagePriority = req.query.triagePriority;
            const result = await outpatientService.getQueue(hospitalId, {
                page,
                limit,
                status,
                doctorId,
                triagePriority,
            });
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async recordVitals(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const encounterId = req.params.id;
            const { vitalSigns, nursingNotes } = req.body;
            const updated = await outpatientService.recordVitals(encounterId, hospitalId, {
                vitalSigns,
                nursingNotes,
            });
            if (!updated) {
                res.status(404).json({ success: false, message: 'Encounter not found' });
                return;
            }
            res.status(200).json({ success: true, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
    async startConsultation(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const doctorId = authReq.user._id;
            const encounterId = req.params.id;
            const updated = await outpatientService.startConsultation(encounterId, hospitalId, doctorId);
            if (!updated) {
                res.status(404).json({ success: false, message: 'Encounter not found' });
                return;
            }
            res.status(200).json({ success: true, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
    async completeConsultation(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const encounterId = req.params.id;
            const { consultationNotes, diagnoses } = req.body;
            const updated = await outpatientService.completeConsultation(encounterId, hospitalId, {
                consultationNotes,
                diagnoses,
            });
            if (!updated) {
                res.status(404).json({ success: false, message: 'Encounter not found' });
                return;
            }
            res.status(200).json({ success: true, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
}
export const outpatientController = new OutpatientController();
