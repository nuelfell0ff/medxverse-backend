import { emergencyService } from './emergency.service.js';
import { TriageScale, } from './emergency.types.js';
export class EmergencyController {
    auth(req) { return req.user; }
    async createVisit(req, res, next) {
        try {
            const user = this.auth(req);
            const visit = await emergencyService.createVisit({
                ...req.body,
                hospitalId: user.hospitalId,
                actorId: user._id,
                arrivalMode: req.body.arrivalMode,
                traumaType: req.body.traumaType,
            });
            res.status(201).json({ success: true, data: visit });
        }
        catch (error) {
            next(error);
        }
    }
    async getBoard(req, res, next) {
        try {
            const user = this.auth(req);
            const data = await emergencyService.getBoard(user.hospitalId, {
                status: req.query.status,
                acuityLevel: req.query.acuityLevel ? Number(req.query.acuityLevel) : undefined,
                zone: req.query.zone,
                page: Number(req.query.page || 1),
                limit: Number(req.query.limit || 50),
            });
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    async getVisits(req, res, next) {
        try {
            const user = this.auth(req);
            const data = await emergencyService.getVisits(user.hospitalId, {
                status: req.query.status,
                acuityLevel: req.query.acuityLevel ? Number(req.query.acuityLevel) : undefined,
                patientId: req.query.patientId,
                visitNumber: req.query.visitNumber,
                page: Number(req.query.page || 1),
                limit: Number(req.query.limit || 20),
            });
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    async getVisit(req, res, next) {
        try {
            const data = await emergencyService.getVisitById(req.params.id, this.auth(req).hospitalId);
            if (!data) {
                res.status(404).json({ success: false, message: 'ED visit not found' });
                return;
            }
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    async triage(req, res, next) {
        try {
            const user = this.auth(req);
            if (!user?._id) {
                res.status(401).json({ success: false, message: 'Authenticated user ID is missing.' });
                return;
            }
            if (!user?.hospitalId) {
                res.status(400).json({ success: false, message: 'Hospital context is missing.' });
                return;
            }
            const body = req.body ?? {};
            const scale = typeof body.scale === 'string' ? body.scale.trim().toUpperCase() : '';
            const acuityLevel = Number(body.acuityLevel);
            const errors = [];
            if (!Object.values(TriageScale).includes(scale)) {
                errors.push('scale must be ESI or CTAS');
            }
            if (!Number.isInteger(acuityLevel) || acuityLevel < 1 || acuityLevel > 5) {
                errors.push('acuityLevel must be an integer between 1 and 5');
            }
            if (body.chiefComplaint !== undefined && body.chiefComplaint !== null && typeof body.chiefComplaint !== 'string') {
                errors.push('chiefComplaint must be a string');
            }
            if (body.vitals !== undefined && (typeof body.vitals !== 'object' || Array.isArray(body.vitals))) {
                errors.push('vitals must be an object');
            }
            if (errors.length) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid triage request.',
                    errors,
                });
                return;
            }
            const data = await emergencyService.createTriage(req.params.id, user.hospitalId, user._id, {
                scale: scale,
                acuityLevel: acuityLevel,
                chiefComplaint: typeof body.chiefComplaint === 'string' ? body.chiefComplaint : undefined,
                vitals: body.vitals,
                resourceNeeds: body.resourceNeeds,
                notes: typeof body.notes === 'string' ? body.notes : undefined,
            });
            res.status(201).json({ success: true, data });
        }
        catch (error) {
            if (error instanceof Error && (error.message.startsWith('Triage validation failed:') ||
                error.message.startsWith('Invalid ObjectId:'))) {
                res.status(400).json({
                    success: false,
                    message: error.message,
                    errors: [error.message],
                });
                return;
            }
            next(error);
        }
    }
    async getBays(req, res, next) {
        try {
            res.json({ success: true, data: await emergencyService.getBays(this.auth(req).hospitalId) });
        }
        catch (error) {
            next(error);
        }
    }
    async createBay(req, res, next) {
        try {
            const user = this.auth(req);
            const data = await emergencyService.createBay(user.hospitalId, user._id, req.body);
            res.status(201).json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    async assignBay(req, res, next) {
        try {
            const user = this.auth(req);
            const data = await emergencyService.assignBay(req.params.id, user.hospitalId, user._id, {
                bayId: req.body.bayId,
                bayCode: req.body.bayCode,
                reason: req.body.reason,
            });
            res.status(201).json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    async releaseBay(req, res, next) {
        try {
            const user = this.auth(req);
            const data = await emergencyService.releaseBay(req.params.id, user.hospitalId, user._id, req.body.reason);
            if (!data) {
                res.status(404).json({ success: false, message: 'Active bay assignment not found' });
                return;
            }
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    async createOrder(req, res, next) {
        try {
            const user = this.auth(req);
            const data = await emergencyService.createOrder(req.params.id, user.hospitalId, user._id, {
                type: req.body.type,
                name: req.body.name,
                sourceSystem: req.body.sourceSystem,
                sourceRecordId: req.body.sourceRecordId,
                notes: req.body.notes,
            });
            res.status(201).json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    async updateOrder(req, res, next) {
        try {
            const user = this.auth(req);
            const data = await emergencyService.updateOrder(req.params.orderId, user.hospitalId, user._id, {
                status: req.body.status,
                resultSummary: req.body.resultSummary,
                notes: req.body.notes,
            });
            if (!data) {
                res.status(404).json({ success: false, message: 'ED order not found' });
                return;
            }
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    async updateStatus(req, res, next) {
        try {
            const user = this.auth(req);
            const data = await emergencyService.updateStatus(req.params.id, user.hospitalId, user._id, {
                status: req.body.status,
                reason: req.body.reason,
            });
            if (!data) {
                res.status(404).json({ success: false, message: 'ED visit not found' });
                return;
            }
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    async disposition(req, res, next) {
        try {
            const user = this.auth(req);
            const data = await emergencyService.recordDisposition(req.params.id, user.hospitalId, user._id, {
                disposition: req.body.disposition,
                notes: req.body.notes,
                wardId: req.body.wardId,
                transferFacility: req.body.transferFacility,
            });
            res.status(201).json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    async statusHistory(req, res, next) {
        try {
            res.json({ success: true, data: await emergencyService.getStatusHistory(req.params.id, this.auth(req).hospitalId) });
        }
        catch (error) {
            next(error);
        }
    }
}
export const emergencyController = new EmergencyController();
