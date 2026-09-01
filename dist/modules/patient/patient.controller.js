import { PatientService } from './patient.service.js';
const getHospitalId = (user) => user?.hospitalId || user?.accountId || user?.id || user?._id;
const getUserId = (user) => user?.id || user?._id || user?.accountId;
export class PatientController {
    static async register(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = getHospitalId(authReq.user);
            if (!hospitalId) {
                res.status(400).json({ success: false, message: 'Hospital ID not found in authentication context.' });
                return;
            }
            const patient = await PatientService.registerPatient(hospitalId, authReq.body);
            res.status(201).json({ success: true, data: patient });
        }
        catch (error) {
            next(error);
        }
    }
    static async list(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = getHospitalId(authReq.user);
            if (!hospitalId) {
                res.status(400).json({ success: false, message: 'Hospital ID not found in authentication context.' });
                return;
            }
            const result = await PatientService.getPatients(hospitalId, authReq.query);
            res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    static async getById(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = getHospitalId(authReq.user);
            if (!hospitalId) {
                res.status(400).json({ success: false, message: 'Hospital ID not found in authentication context.' });
                return;
            }
            const patient = await PatientService.getPatientById(hospitalId, req.params.id);
            res.status(200).json({ success: true, data: patient });
        }
        catch (error) {
            next(error);
        }
    }
    static async getClinicalSummary(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = getHospitalId(authReq.user);
            if (!hospitalId) {
                res.status(400).json({ success: false, message: 'Hospital ID not found in authentication context.' });
                return;
            }
            const data = await PatientService.getPatientClinicalSummary(hospitalId, req.params.id);
            res.status(200).json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    static async recordVitals(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = getHospitalId(authReq.user);
            const userId = getUserId(authReq.user);
            if (!hospitalId || !userId) {
                res.status(400).json({ success: false, message: 'User authentication context is incomplete.' });
                return;
            }
            const patient = await PatientService.addVitals(hospitalId, req.params.id, userId, authReq.body);
            res.status(200).json({ success: true, data: patient });
        }
        catch (error) {
            next(error);
        }
    }
}
