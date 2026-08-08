import { administrationService } from './administration.service.js';
export class AdministrationController {
    async createBranch(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const { name, code, address, phone, email } = req.body;
            const branch = await administrationService.createBranch({
                hospitalId,
                name,
                code,
                address,
                phone,
                email,
            });
            res.status(201).json({ success: true, data: branch });
        }
        catch (error) {
            next(error);
        }
    }
    async getBranches(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const branches = await administrationService.getBranches(hospitalId);
            res.status(200).json({ success: true, data: branches });
        }
        catch (error) {
            next(error);
        }
    }
    async createRole(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const { name, description, permissions } = req.body;
            const role = await administrationService.createRole({
                hospitalId,
                name,
                description,
                permissions,
            });
            res.status(201).json({ success: true, data: role });
        }
        catch (error) {
            next(error);
        }
    }
    async getRoles(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const roles = await administrationService.getRoles(hospitalId);
            res.status(200).json({ success: true, data: roles });
        }
        catch (error) {
            next(error);
        }
    }
    async getAuditLogs(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
            const userId = req.query.userId;
            const action = req.query.action;
            const resource = req.query.resource;
            const result = await administrationService.getAuditLogs(hospitalId, {
                page,
                limit,
                userId,
                action,
                resource,
            });
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async getUserDeviceSessions(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const userId = req.params.userId ? req.params.userId : authReq.user._id;
            const sessions = await administrationService.getUserDeviceSessions(userId, hospitalId);
            res.status(200).json({ success: true, data: sessions });
        }
        catch (error) {
            next(error);
        }
    }
    async revokeDeviceSession(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const id = req.params.id;
            const revoked = await administrationService.revokeDeviceSession(id, hospitalId);
            if (!revoked) {
                res.status(404).json({ success: false, message: 'Session not found or already revoked' });
                return;
            }
            res.status(200).json({ success: true, message: 'Device session successfully revoked' });
        }
        catch (error) {
            next(error);
        }
    }
}
export const administrationController = new AdministrationController();
