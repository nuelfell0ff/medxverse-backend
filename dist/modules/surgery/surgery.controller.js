import { surgeryService } from './surgery.service.js';
export class SurgeryController {
    async scheduleCase(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const { patientId, leadSurgeonId, theatreId, procedureName, icdCode, urgency, scheduledStartTime, scheduledEndTime, anesthesiaType, surgicalTeam, } = req.body;
            const surgeryCase = await surgeryService.scheduleCase({
                hospitalId,
                patientId,
                leadSurgeonId: leadSurgeonId || authReq.user._id,
                theatreId,
                procedureName,
                icdCode,
                urgency: urgency,
                scheduledStartTime: new Date(scheduledStartTime),
                scheduledEndTime: new Date(scheduledEndTime),
                anesthesiaType: anesthesiaType,
                surgicalTeam,
            });
            res.status(201).json({ success: true, data: surgeryCase });
        }
        catch (error) {
            next(error);
        }
    }
    async getCases(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
            const status = req.query.status;
            const theatreId = req.query.theatreId;
            const leadSurgeonId = req.query.leadSurgeonId;
            const patientId = req.query.patientId;
            const date = req.query.date;
            const result = await surgeryService.getCases(hospitalId, {
                page,
                limit,
                status,
                theatreId,
                leadSurgeonId,
                patientId,
                date,
            });
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async getCaseById(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const id = req.params.id;
            const surgeryCase = await surgeryService.getCaseById(id, hospitalId);
            if (!surgeryCase) {
                res.status(404).json({ success: false, message: 'Surgical case not found' });
                return;
            }
            res.status(200).json({ success: true, data: surgeryCase });
        }
        catch (error) {
            next(error);
        }
    }
    async updateChecklist(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const id = req.params.id;
            const { signInCompleted, timeOutCompleted, signOutCompleted, notes } = req.body;
            const updated = await surgeryService.updateChecklist(id, hospitalId, {
                signInCompleted,
                timeOutCompleted,
                signOutCompleted,
                notes,
            });
            if (!updated) {
                res.status(404).json({ success: false, message: 'Surgical case not found' });
                return;
            }
            res.status(200).json({ success: true, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
    async startSurgery(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const id = req.params.id;
            const updated = await surgeryService.startSurgery(id, hospitalId);
            if (!updated) {
                res.status(404).json({ success: false, message: 'Surgical case not found or not in scheduled state' });
                return;
            }
            res.status(200).json({ success: true, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
    async completeSurgery(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const id = req.params.id;
            const { anesthesiaNotes, operationNotes, postOpNotes } = req.body;
            const updated = await surgeryService.completeSurgery(id, hospitalId, {
                anesthesiaNotes,
                operationNotes,
                postOpNotes,
            });
            if (!updated) {
                res.status(404).json({ success: false, message: 'Surgical case not found or not currently in progress' });
                return;
            }
            res.status(200).json({ success: true, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
    async cancelCase(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const id = req.params.id;
            const { cancellationReason } = req.body;
            const updated = await surgeryService.cancelCase(id, hospitalId, cancellationReason || 'No reason specified');
            if (!updated) {
                res.status(404).json({ success: false, message: 'Surgical case not found or already completed' });
                return;
            }
            res.status(200).json({ success: true, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
}
export const surgeryController = new SurgeryController();
