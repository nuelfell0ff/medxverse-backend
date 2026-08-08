import { eyeClinicService } from './eye-clinic.service.js';
export class EyeClinicController {
    async createEyeExam(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const examinerId = authReq.user._id;
            const { patientId, examType, chiefComplaint, visualAcuityUncorrected, refraction, tonometry, slitLampFindings, fundusFindings, diagnosis, treatmentPlan, notes, } = req.body;
            const exam = await eyeClinicService.createEyeExam({
                hospitalId,
                patientId,
                examinerId,
                examType: examType,
                chiefComplaint,
                visualAcuityUncorrected,
                refraction,
                tonometry,
                slitLampFindings,
                fundusFindings,
                diagnosis,
                treatmentPlan,
                notes,
            });
            res.status(201).json({ success: true, data: exam });
        }
        catch (error) {
            next(error);
        }
    }
    async getEyeExams(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
            const patientId = req.query.patientId;
            const examinerId = req.query.examinerId;
            const examType = req.query.examType;
            const result = await eyeClinicService.getEyeExams(hospitalId, {
                page,
                limit,
                patientId,
                examinerId,
                examType,
            });
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async getEyeExamById(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const id = req.params.id;
            const exam = await eyeClinicService.getEyeExamById(id, hospitalId);
            if (!exam) {
                res.status(404).json({ success: false, message: 'Eye examination record not found' });
                return;
            }
            res.status(200).json({ success: true, data: exam });
        }
        catch (error) {
            next(error);
        }
    }
    async createOpticalPrescription(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const prescribedById = authReq.user._id;
            const { patientId, examId, prescriptionType, lensType, rightEye, leftEye, pupillaryDistanceMm, expirationDate, specialInstructions, } = req.body;
            const prescription = await eyeClinicService.createOpticalPrescription({
                hospitalId,
                patientId,
                prescribedById,
                examId,
                prescriptionType: prescriptionType,
                lensType: lensType,
                rightEye,
                leftEye,
                pupillaryDistanceMm,
                expirationDate,
                specialInstructions,
            });
            res.status(201).json({ success: true, data: prescription });
        }
        catch (error) {
            next(error);
        }
    }
    async getOpticalPrescriptions(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
            const patientId = req.query.patientId;
            const prescribedById = req.query.prescribedById;
            const prescriptionType = req.query.prescriptionType;
            const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
            const result = await eyeClinicService.getOpticalPrescriptions(hospitalId, {
                page,
                limit,
                patientId,
                prescribedById,
                prescriptionType,
                isActive,
            });
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async getOpticalPrescriptionById(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const id = req.params.id;
            const prescription = await eyeClinicService.getOpticalPrescriptionById(id, hospitalId);
            if (!prescription) {
                res.status(404).json({ success: false, message: 'Optical prescription not found' });
                return;
            }
            res.status(200).json({ success: true, data: prescription });
        }
        catch (error) {
            next(error);
        }
    }
}
export const eyeClinicController = new EyeClinicController();
