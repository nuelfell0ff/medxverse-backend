import { AppointmentService } from './appointment.service.js';
export class AppointmentController {
    static getHospitalId(req) {
        const authReq = req;
        const user = authReq.user;
        return user?.hospitalId || user?.accountId || user?.id || user?._id || null;
    }
    static async create(req, res, next) {
        try {
            const hospitalId = AppointmentController.getHospitalId(req);
            if (!hospitalId) {
                res.status(400).json({
                    success: false,
                    message: 'Hospital ID not found in authentication context.',
                });
                return;
            }
            const appointment = await AppointmentService.createAppointment(hospitalId, req.body);
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
            const hospitalId = AppointmentController.getHospitalId(req);
            if (!hospitalId) {
                res.status(400).json({
                    success: false,
                    message: 'Hospital ID not found in authentication context.',
                });
                return;
            }
            const query = req.query;
            const result = await AppointmentService.getAppointments(hospitalId, query);
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
            const hospitalId = AppointmentController.getHospitalId(req);
            const appointmentId = req.params.id;
            if (!hospitalId) {
                res.status(400).json({
                    success: false,
                    message: 'Hospital ID not found in authentication context.',
                });
                return;
            }
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
            const hospitalId = AppointmentController.getHospitalId(req);
            const appointmentId = req.params.id;
            if (!hospitalId) {
                res.status(400).json({
                    success: false,
                    message: 'Hospital ID not found in authentication context.',
                });
                return;
            }
            const updated = await AppointmentService.updateStatus(hospitalId, appointmentId, req.body);
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
