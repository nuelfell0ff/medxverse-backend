import { LabService } from './lab.service.js';
export class LabController {
    static async create(req, res, next) {
        try {
            const authReq = req;
            const user = authReq.user;
            const hospitalId = user.hospitalId || user.id;
            const order = await LabService.createOrder(hospitalId, user.id, authReq.body);
            res.status(201).json({
                success: true,
                data: order,
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
            const result = await LabService.getOrders(hospitalId, authReq.query);
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
            const orderId = req.params.id;
            const order = await LabService.getOrderById(hospitalId, orderId);
            res.status(200).json({
                success: true,
                data: order,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async collectSample(req, res, next) {
        try {
            const authReq = req;
            const user = authReq.user;
            const hospitalId = user.hospitalId || user.id;
            const orderId = req.params.id;
            const updated = await LabService.markSampleCollected(hospitalId, orderId, user.id);
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async submitResults(req, res, next) {
        try {
            const authReq = req;
            const user = authReq.user;
            const hospitalId = user.hospitalId || user.id;
            const orderId = req.params.id;
            const updated = await LabService.recordResults(hospitalId, orderId, user.id, authReq.body);
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
