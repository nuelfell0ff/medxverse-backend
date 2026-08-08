import { PatientService } from './patient.service.js';
export class PatientController {
    static async register(req, res, next) {
        try {
            const authReq = req;
            const user = authReq.user;
            const hospitalId = user.hospitalId || user.id;
            const patient = await PatientService.registerPatient(hospitalId, authReq.body);
            res.status(201).json({
                success: true,
                data: patient,
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
            const result = await PatientService.getPatients(hospitalId, authReq.query);
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
            const patientId = req.params.id;
            const patient = await PatientService.getPatientById(hospitalId, patientId);
            res.status(200).json({
                success: true,
                data: patient,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async recordVitals(req, res, next) {
        try {
            const authReq = req;
            const user = authReq.user;
            const hospitalId = user.hospitalId || user.id;
            const patientId = req.params.id;
            const patient = await PatientService.addVitals(hospitalId, patientId, user.id, authReq.body);
            res.status(200).json({
                success: true,
                data: patient,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
