import { telemedicineService } from './telemedicine.service.js';
export class TelemedicineController {
    async createSession(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const { patientId, doctorId, consultationType, scheduledStartTime, chiefComplaint } = req.body;
            const session = await telemedicineService.createSession({
                hospitalId,
                patientId,
                doctorId,
                consultationType: consultationType,
                scheduledStartTime,
                chiefComplaint,
            });
            res.status(201).json({ success: true, data: session });
        }
        catch (error) {
            next(error);
        }
    }
    async getSessions(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
            const patientId = req.query.patientId;
            const doctorId = req.query.doctorId;
            const status = req.query.status;
            const consultationType = req.query.consultationType;
            const result = await telemedicineService.getSessions(hospitalId, {
                page,
                limit,
                patientId,
                doctorId,
                status,
                consultationType,
            });
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async getSessionById(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const id = req.params.id;
            const session = await telemedicineService.getSessionById(id, hospitalId);
            if (!session) {
                res.status(404).json({ success: false, message: 'Telemedicine session not found' });
                return;
            }
            res.status(200).json({ success: true, data: session });
        }
        catch (error) {
            next(error);
        }
    }
    async updateSessionStatus(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const id = req.params.id;
            const { status, clinicalNotes, recordingUrl } = req.body;
            const updated = await telemedicineService.updateSessionStatus(id, hospitalId, {
                status: status,
                clinicalNotes,
                recordingUrl,
            });
            if (!updated) {
                res.status(404).json({ success: false, message: 'Telemedicine session not found' });
                return;
            }
            res.status(200).json({ success: true, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
    async sendMessage(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const senderId = authReq.user._id;
            const { sessionId, senderModel, messageText, attachmentUrl } = req.body;
            const message = await telemedicineService.sendMessage({
                hospitalId,
                sessionId,
                senderId,
                senderModel: senderModel || 'User',
                messageText,
                attachmentUrl,
            });
            res.status(201).json({ success: true, data: message });
        }
        catch (error) {
            next(error);
        }
    }
    async getSessionMessages(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const sessionId = req.params.sessionId;
            const messages = await telemedicineService.getSessionMessages(sessionId, hospitalId);
            res.status(200).json({ success: true, data: messages });
        }
        catch (error) {
            next(error);
        }
    }
}
export const telemedicineController = new TelemedicineController();
