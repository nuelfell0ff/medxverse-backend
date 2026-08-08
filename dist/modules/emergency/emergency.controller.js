import { emergencyService } from './emergency.service.js';
import { TraumaType, } from './emergency.types.js';
export class EmergencyController {
    async createCase(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const triagedById = authReq.user._id;
            const { patientId, isUnidentified, temporaryIdentifier, chiefComplaint, arrivalMode, triageCategory, triageVitals, assignedBay, traumaType, attendingDoctorId, } = req.body;
            const emergencyCase = await emergencyService.createCase({
                hospitalId,
                patientId,
                isUnidentified: Boolean(isUnidentified),
                temporaryIdentifier,
                chiefComplaint,
                arrivalMode: arrivalMode,
                triageCategory: triageCategory,
                triageVitals,
                assignedBay,
                traumaType: traumaType || TraumaType.NONE,
                attendingDoctorId,
                triagedById,
            });
            res.status(201).json({ success: true, data: emergencyCase });
        }
        catch (error) {
            next(error);
        }
    }
    async getCases(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
            const status = req.query.status;
            const triageCategory = req.query.triageCategory;
            const traumaType = req.query.traumaType;
            const patientId = req.query.patientId;
            const isUnidentified = req.query.isUnidentified !== undefined
                ? req.query.isUnidentified === 'true'
                : undefined;
            const result = await emergencyService.getCases(hospitalId, {
                page,
                limit,
                status,
                triageCategory,
                traumaType,
                patientId,
                isUnidentified,
            });
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async getCaseById(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const id = req.params.id;
            const emergencyCase = await emergencyService.getCaseById(id, hospitalId);
            if (!emergencyCase) {
                res.status(404).json({ success: false, message: 'Emergency case not found' });
                return;
            }
            res.status(200).json({ success: true, data: emergencyCase });
        }
        catch (error) {
            next(error);
        }
    }
    async updateTriage(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const id = req.params.id;
            const { triageCategory, triageVitals, assignedBay, attendingDoctorId } = req.body;
            const updated = await emergencyService.updateTriage(id, hospitalId, {
                triageCategory: triageCategory,
                triageVitals,
                assignedBay,
                attendingDoctorId,
            });
            if (!updated) {
                res.status(404).json({ success: false, message: 'Emergency case not found' });
                return;
            }
            res.status(200).json({ success: true, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
    async updateStatus(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const id = req.params.id;
            const { status, dispositionNotes, admittedToWardId, transferredToFacility } = req.body;
            const updated = await emergencyService.updateStatus(id, hospitalId, {
                status: status,
                dispositionNotes,
                admittedToWardId,
                transferredToFacility,
            });
            if (!updated) {
                res.status(404).json({ success: false, message: 'Emergency case not found' });
                return;
            }
            res.status(200).json({ success: true, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
}
export const emergencyController = new EmergencyController();
