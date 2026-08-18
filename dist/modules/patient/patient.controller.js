import { PatientService } from './patient.service.js';
export class PatientController {
    static async register(req, res, next) {
        try {
            const authReq = req;
            const user = authReq.user;
            // Ensure hospitalId is resolved correctly from JWT payload (accountId/id/_id/hospitalId)
            const hospitalId = user?.hospitalId || user?.accountId || user?.id || user?._id;
            if (!hospitalId) {
                res.status(400).json({
                    success: false,
                    message: 'Hospital ID not found in authentication context.',
                });
                return;
            }
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
            const hospitalId = user?.hospitalId || user?.accountId || user?.id || user?._id;
            if (!hospitalId) {
                res.status(400).json({
                    success: false,
                    message: 'Hospital ID not found in authentication context.',
                });
                return;
            }
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
            const hospitalId = user?.hospitalId || user?.accountId || user?.id || user?._id;
            const patientId = req.params.id;
            if (!hospitalId) {
                res.status(400).json({
                    success: false,
                    message: 'Hospital ID not found in authentication context.',
                });
                return;
            }
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
            const hospitalId = user?.hospitalId || user?.accountId || user?.id || user?._id;
            const userId = user?.id || user?.accountId || user?._id;
            const patientId = req.params.id;
            if (!hospitalId || !userId) {
                res.status(400).json({
                    success: false,
                    message: 'User authentication context is incomplete.',
                });
                return;
            }
            const patient = await PatientService.addVitals(hospitalId, patientId, userId, authReq.body);
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
