import { ConsultationService } from './consultation.service.js';
export class ConsultationController {
    static async create(req, res, next) {
        try {
            const authReq = req;
            const user = authReq.user;
            const hospitalId = user.hospitalId || user.id;
            const doctorId = user.id;
            const consultation = await ConsultationService.createConsultation(hospitalId, doctorId, authReq.body);
            res.status(201).json({
                success: true,
                data: consultation,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async list(req, res, next) {
        try {
            const authReq = req;
            const user = authReq.user;
            const hospitalId = user.hospitalId || user.id;
            const result = await ConsultationService.getConsultations(hospitalId, authReq.query);
            res.status(200).json({
                success: true,
                ...result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getById(req, res, next) {
        try {
            const authReq = req;
            const user = authReq.user;
            const hospitalId = user.hospitalId || user.id;
            const consultationId = req.params.id;
            const consultation = await ConsultationService.getConsultationById(hospitalId, consultationId);
            res.status(200).json({
                success: true,
                data: consultation,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async update(req, res, next) {
        try {
            const authReq = req;
            const user = authReq.user;
            const hospitalId = user.hospitalId || user.id;
            const consultationId = req.params.id;
            const updated = await ConsultationService.updateConsultation(hospitalId, consultationId, authReq.body);
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
