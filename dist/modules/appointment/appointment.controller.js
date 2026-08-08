import { AppointmentService } from './appointment.service.js';
export class AppointmentController {
    static async create(req, res, next) {
        try {
            const authReq = req;
            const user = authReq.user;
            const hospitalId = user.hospitalId || user.id;
            const appointment = await AppointmentService.createAppointment(hospitalId, authReq.body);
            res.status(201).json({
                success: true,
                data: appointment,
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
            const result = await AppointmentService.getAppointments(hospitalId, authReq.query);
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
            const appointmentId = req.params.id;
            const appointment = await AppointmentService.getAppointmentById(hospitalId, appointmentId);
            res.status(200).json({
                success: true,
                data: appointment,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateStatus(req, res, next) {
        try {
            const authReq = req;
            const user = authReq.user;
            const hospitalId = user.hospitalId || user.id;
            const appointmentId = req.params.id;
            const updated = await AppointmentService.updateStatus(hospitalId, appointmentId, authReq.body);
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
