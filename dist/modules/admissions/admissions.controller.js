import { admissionsService } from './admissions.service.js';
export class AdmissionsController {
    async admitPatient(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const { patientId, admittingDoctorId, wardId, bedNumber, bedType, admissionReason } = req.body;
            const admission = await admissionsService.admitPatient({
                hospitalId,
                patientId,
                admittingDoctorId: admittingDoctorId || authReq.user._id,
                wardId,
                bedNumber,
                bedType: bedType,
                admissionReason,
            });
            res.status(201).json({ success: true, data: admission });
        }
        catch (error) {
            next(error);
        }
    }
    async getAdmissions(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
            const status = req.query.status;
            const wardId = req.query.wardId;
            const patientId = req.query.patientId;
            const result = await admissionsService.getAdmissions(hospitalId, {
                page,
                limit,
                status,
                wardId,
                patientId,
            });
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async getAdmissionById(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const id = req.params.id;
            const admission = await admissionsService.getAdmissionById(id, hospitalId);
            if (!admission) {
                res.status(404).json({ success: false, message: 'Admission record not found' });
                return;
            }
            res.status(200).json({ success: true, data: admission });
        }
        catch (error) {
            next(error);
        }
    }
    async transferBed(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const transferredBy = authReq.user._id;
            const id = req.params.id;
            const { toWardId, toBedNumber, reason } = req.body;
            const updated = await admissionsService.transferBed(id, hospitalId, {
                toWardId,
                toBedNumber,
                transferredBy,
                reason,
            });
            res.status(200).json({ success: true, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
    async dischargePatient(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const id = req.params.id;
            const { dischargeSummary } = req.body;
            const updated = await admissionsService.dischargePatient(id, hospitalId, {
                dischargeSummary,
            });
            if (!updated) {
                res.status(404).json({ success: false, message: 'Active admission record not found' });
                return;
            }
            res.status(200).json({ success: true, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
}
export const admissionsController = new AdmissionsController();
