import { otService } from './ot.service.js';
export class OTController {
    async createCase(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const createdById = authReq.user._id;
            const { patientId, otRoomNumber, urgency, procedure, surgicalTeam, anesthesiaType, preOpNotes, scheduledStartTime, scheduledEndTime, } = req.body;
            const surgicalCase = await otService.createCase({
                hospitalId,
                patientId,
                otRoomNumber,
                urgency: urgency,
                procedure,
                surgicalTeam,
                anesthesiaType: anesthesiaType,
                preOpNotes,
                scheduledStartTime,
                scheduledEndTime,
                createdById,
            });
            res.status(201).json({ success: true, data: surgicalCase });
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
            const urgency = req.query.urgency;
            const otRoomNumber = req.query.otRoomNumber;
            const patientId = req.query.patientId;
            const startDate = req.query.startDate;
            const endDate = req.query.endDate;
            const result = await otService.getCases(hospitalId, {
                page,
                limit,
                status,
                urgency,
                otRoomNumber,
                patientId,
                startDate,
                endDate,
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
            const surgicalCase = await otService.getCaseById(id, hospitalId);
            if (!surgicalCase) {
                res.status(404).json({ success: false, message: 'Surgical case not found' });
                return;
            }
            res.status(200).json({ success: true, data: surgicalCase });
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
            const { status, actualStartTime, actualEndTime } = req.body;
            const updated = await otService.updateStatus(id, hospitalId, {
                status: status,
                actualStartTime: actualStartTime ? new Date(actualStartTime) : undefined,
                actualEndTime: actualEndTime ? new Date(actualEndTime) : undefined,
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
    async updateSurgicalTeam(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const id = req.params.id;
            const { surgicalTeam } = req.body;
            const updated = await otService.updateSurgicalTeam(id, hospitalId, {
                surgicalTeam,
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
    async updatePostOpNotes(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const id = req.params.id;
            const { postOpNotes } = req.body;
            const updated = await otService.updatePostOpNotes(id, hospitalId, {
                postOpNotes,
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
}
export const otController = new OTController();
