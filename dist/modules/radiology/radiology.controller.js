import { radiologyService } from './radiology.service.js';
export class RadiologyController {
    async createOrder(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const { patientId, orderingDoctorId, modality, procedureName, bodyPart, clinicalIndication, priority, } = req.body;
            const order = await radiologyService.createOrder({
                hospitalId,
                patientId,
                orderingDoctorId: orderingDoctorId || authReq.user._id,
                modality: modality,
                procedureName,
                bodyPart,
                clinicalIndication,
                priority: priority,
            });
            res.status(201).json({ success: true, data: order });
        }
        catch (error) {
            next(error);
        }
    }
    async getOrders(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
            const status = req.query.status;
            const modality = req.query.modality;
            const patientId = req.query.patientId;
            const orderingDoctorId = req.query.orderingDoctorId;
            const radiologistId = req.query.radiologistId;
            const result = await radiologyService.getOrders(hospitalId, {
                page,
                limit,
                status,
                modality,
                patientId,
                orderingDoctorId,
                radiologistId,
            });
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async getOrderById(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const id = req.params.id;
            const order = await radiologyService.getOrderById(id, hospitalId);
            if (!order) {
                res.status(404).json({ success: false, message: 'Radiology order not found' });
                return;
            }
            res.status(200).json({ success: true, data: order });
        }
        catch (error) {
            next(error);
        }
    }
    async updatePacsData(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const id = req.params.id;
            const { studyInstanceUid, seriesInstanceUid, imageCount, dicomViewerUrl, dicomFileKeys } = req.body;
            const updated = await radiologyService.updatePacsData(id, hospitalId, {
                studyInstanceUid,
                seriesInstanceUid,
                imageCount,
                dicomViewerUrl,
                dicomFileKeys,
            });
            if (!updated) {
                res.status(404).json({ success: false, message: 'Radiology order not found' });
                return;
            }
            res.status(200).json({ success: true, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
    async completeReport(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const radiologistId = authReq.user._id;
            const id = req.params.id;
            const { findings, impression, radiologistNotes } = req.body;
            const updated = await radiologyService.completeReport(id, hospitalId, {
                radiologistId,
                findings,
                impression,
                radiologistNotes,
            });
            if (!updated) {
                res.status(404).json({ success: false, message: 'Radiology order not found' });
                return;
            }
            res.status(200).json({ success: true, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
    async cancelOrder(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const id = req.params.id;
            const { cancellationReason } = req.body;
            const updated = await radiologyService.cancelOrder(id, hospitalId, cancellationReason || 'No reason provided');
            if (!updated) {
                res.status(404).json({ success: false, message: 'Radiology order not found or already reported' });
                return;
            }
            res.status(200).json({ success: true, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
}
export const radiologyController = new RadiologyController();
