import { bloodBankService } from './blood-bank.service.js';
export class BloodBankController {
    async addBloodUnit(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const { donorId, donorCode, unitNumber, bloodGroup, componentType, volumeMl, collectionDate, expiryDate, storageLocation, notes, } = req.body;
            const bloodUnit = await bloodBankService.addBloodUnit({
                hospitalId,
                donorId,
                donorCode,
                unitNumber,
                bloodGroup: bloodGroup,
                componentType: componentType,
                volumeMl,
                collectionDate,
                expiryDate,
                storageLocation,
                notes,
            });
            res.status(201).json({ success: true, data: bloodUnit });
        }
        catch (error) {
            next(error);
        }
    }
    async getBloodUnits(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
            const bloodGroup = req.query.bloodGroup;
            const componentType = req.query.componentType;
            const status = req.query.status;
            const unitNumber = req.query.unitNumber;
            const result = await bloodBankService.getBloodUnits(hospitalId, {
                page,
                limit,
                bloodGroup,
                componentType,
                status,
                unitNumber,
            });
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async createTransfusionRequest(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const requestedById = authReq.user._id;
            const { patientId, bloodGroup, componentType, unitsRequested, urgency, clinicalIndication, notes } = req.body;
            const request = await bloodBankService.createTransfusionRequest({
                hospitalId,
                patientId,
                requestedById,
                bloodGroup: bloodGroup,
                componentType: componentType,
                unitsRequested,
                urgency: urgency,
                clinicalIndication,
                notes,
            });
            res.status(201).json({ success: true, data: request });
        }
        catch (error) {
            next(error);
        }
    }
    async getTransfusionRequests(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
            const status = req.query.status;
            const urgency = req.query.urgency;
            const patientId = req.query.patientId;
            const bloodGroup = req.query.bloodGroup;
            const result = await bloodBankService.getTransfusionRequests(hospitalId, {
                page,
                limit,
                status,
                urgency,
                patientId,
                bloodGroup,
            });
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async getTransfusionRequestById(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const id = req.params.id;
            const request = await bloodBankService.getTransfusionRequestById(id, hospitalId);
            if (!request) {
                res.status(404).json({ success: false, message: 'Transfusion request not found' });
                return;
            }
            res.status(200).json({ success: true, data: request });
        }
        catch (error) {
            next(error);
        }
    }
    async updateCrossmatch(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const id = req.params.id;
            const { crossmatchResult, assignedUnitIds, notes } = req.body;
            const updated = await bloodBankService.updateCrossmatch(id, hospitalId, {
                crossmatchResult: crossmatchResult,
                assignedUnitIds,
                notes,
            });
            if (!updated) {
                res.status(404).json({ success: false, message: 'Transfusion request not found' });
                return;
            }
            res.status(200).json({ success: true, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
    async updateRequestStatus(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const id = req.params.id;
            const { status, notes } = req.body;
            const updated = await bloodBankService.updateRequestStatus(id, hospitalId, {
                status: status,
                notes,
            });
            if (!updated) {
                res.status(404).json({ success: false, message: 'Transfusion request not found' });
                return;
            }
            res.status(200).json({ success: true, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
}
export const bloodBankController = new BloodBankController();
