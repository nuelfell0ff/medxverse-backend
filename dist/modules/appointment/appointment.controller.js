import { AppointmentService } from './appointment.service.js';
export class AppointmentController {
    static getHospitalId(req) {
        const authenticated = req;
        const account = authenticated.account;
        const user = authenticated.user;
        const hospitalId = account?.hospitalId ??
            account?.hospital ??
            account?.accountId ??
            account?.id ??
            account?._id ??
            user?.hospitalId ??
            user?.hospital ??
            user?.accountId ??
            user?.id ??
            user?._id ??
            null;
        return hospitalId ? String(hospitalId) : null;
    }
    static hospital(req, res) {
        const hospitalId = this.getHospitalId(req);
        if (!hospitalId) {
            res.status(401).json({
                statusCode: 401,
                success: false,
                message: 'Authenticated hospital context is missing.',
                errors: [],
            });
            return null;
        }
        return hospitalId;
    }
    static async create(req, res, next) {
        try {
            const h = this.hospital(req, res);
            if (!h)
                return;
            res.status(201).json({
                success: true,
                data: await AppointmentService.createAppointment(h, req.body),
            });
        }
        catch (e) {
            next(e);
        }
    }
    static async list(req, res, next) {
        try {
            const h = this.hospital(req, res);
            if (!h)
                return;
            res.json({
                success: true,
                ...(await AppointmentService.getAppointments(h, req.query)),
            });
        }
        catch (e) {
            next(e);
        }
    }
    static async getById(req, res, next) {
        try {
            const h = this.hospital(req, res);
            if (!h)
                return;
            res.json({
                success: true,
                data: await AppointmentService.getAppointmentById(h, req.params.id),
            });
        }
        catch (e) {
            next(e);
        }
    }
    static async updateStatus(req, res, next) {
        try {
            const h = this.hospital(req, res);
            if (!h)
                return;
            res.json({
                success: true,
                data: await AppointmentService.updateStatus(h, req.params.id, req.body),
            });
        }
        catch (e) {
            next(e);
        }
    }
    static async reschedule(req, res, next) {
        try {
            const h = this.hospital(req, res);
            if (!h)
                return;
            res.json({
                success: true,
                data: await AppointmentService.reschedule(h, req.params.id, req.body),
            });
        }
        catch (e) {
            next(e);
        }
    }
    static async cancel(req, res, next) {
        try {
            const h = this.hospital(req, res);
            if (!h)
                return;
            res.json({
                success: true,
                data: await AppointmentService.cancel(h, req.params.id, req.body?.notes),
            });
        }
        catch (e) {
            next(e);
        }
    }
    static async createSchedule(req, res, next) {
        try {
            const h = this.hospital(req, res);
            if (!h)
                return;
            res.json({
                success: true,
                data: await AppointmentService.createOrUpdateSchedule(h, req.body),
            });
        }
        catch (e) {
            next(e);
        }
    }
    static async getSchedule(req, res, next) {
        try {
            const h = this.hospital(req, res);
            if (!h)
                return;
            res.json({
                success: true,
                data: await AppointmentService.getSchedule(h, req.params.providerId),
            });
        }
        catch (e) {
            next(e);
        }
    }
    static async checkIn(req, res, next) {
        try {
            const h = this.hospital(req, res);
            if (!h)
                return;
            res.status(201).json({
                success: true,
                data: await AppointmentService.checkIn(h, req.params.id, req.body || {}),
            });
        }
        catch (e) {
            next(e);
        }
    }
    static async walkIn(req, res, next) {
        try {
            const h = this.hospital(req, res);
            if (!h)
                return;
            res.status(201).json({
                success: true,
                data: await AppointmentService.createWalkInQueue(h, req.body),
            });
        }
        catch (e) {
            next(e);
        }
    }
    static async queue(req, res, next) {
        try {
            const h = this.hospital(req, res);
            if (!h)
                return;
            res.json({
                success: true,
                ...(await AppointmentService.getQueue(h, req.query)),
            });
        }
        catch (e) {
            next(e);
        }
    }
    static async queueTicket(req, res, next) {
        try {
            const h = this.hospital(req, res);
            if (!h)
                return;
            res.json({
                success: true,
                data: await AppointmentService.updateQueueTicket(h, req.params.ticketId, req.body.status, req.body.delayMinutes),
            });
        }
        catch (e) {
            next(e);
        }
    }
    static async providerDelay(req, res, next) {
        try {
            const h = this.hospital(req, res);
            if (!h)
                return;
            res.json({
                success: true,
                ...(await AppointmentService.updateProviderDelay(h, req.params.providerId, Number(req.body.delayMinutes) || 0, req.body.department)),
            });
        }
        catch (e) {
            next(e);
        }
    }
    static async risk(req, res, next) {
        try {
            const h = this.hospital(req, res);
            if (!h)
                return;
            res.json({
                success: true,
                data: await AppointmentService.getRisk(h, req.params.id),
            });
        }
        catch (e) {
            next(e);
        }
    }
    static async dueReminders(req, res, next) {
        try {
            const h = this.hospital(req, res);
            if (!h)
                return;
            res.json({
                success: true,
                data: await AppointmentService.getDueReminders(h, Number(req.query.limit) || 100),
            });
        }
        catch (e) {
            next(e);
        }
    }
    static async markReminderSent(req, res, next) {
        try {
            const h = this.hospital(req, res);
            if (!h)
                return;
            res.json({
                success: true,
                data: await AppointmentService.markReminderSent(h, req.params.id),
            });
        }
        catch (e) {
            next(e);
        }
    }
}
