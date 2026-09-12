import { PatientService } from './patient.service.js';
const getHospitalId = (user) => user?.hospitalId || user?.accountId || user?.id || user?._id;
const getUserId = (user) => user?.id || user?._id || user?.accountId;
const actor = (req) => {
    const userId = getUserId(req.user);
    if (!userId)
        throw Object.assign(new Error('User authentication context is incomplete.'), { statusCode: 400 });
    return { userId, role: req.user?.role };
};
export class PatientController {
    static async register(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = getHospitalId(authReq.user);
            if (!hospitalId) {
                res.status(400).json({ success: false, message: 'Hospital ID not found in authentication context.' });
                return;
            }
            const patient = await PatientService.registerPatient(hospitalId, authReq.body, actor(authReq));
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
    static async update(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = getHospitalId(authReq.user);
            if (!hospitalId) {
                res.status(400).json({ success: false, message: 'Hospital ID not found in authentication context.' });
                return;
            }
            const patient = await PatientService.updatePatient(hospitalId, req.params.id, actor(authReq), authReq.body);
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
            const data = await PatientService.getClinicalSummary(hospitalId, req.params.id, actor(authReq));
            res.status(200).json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    static async getEHR(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = getHospitalId(authReq.user);
            if (!hospitalId) {
                res.status(400).json({ success: false, message: 'Hospital ID not found in authentication context.' });
                return;
            }
            const includeSensitive = authReq.query.includeSensitive !== 'false';
            const data = await PatientService.getEHRChart(hospitalId, req.params.id, actor(authReq), { includeSensitive });
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
    static async createEncounter(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = getHospitalId(authReq.user);
            if (!hospitalId)
                throw Object.assign(new Error('Hospital ID not found in authentication context.'), { statusCode: 400 });
            const data = await PatientService.createEncounter(hospitalId, actor(authReq), authReq.body);
            res.status(201).json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    static async createResource(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = getHospitalId(authReq.user);
            if (!hospitalId)
                throw Object.assign(new Error('Hospital ID not found in authentication context.'), { statusCode: 400 });
            const data = await PatientService.createEHRResource(hospitalId, actor(authReq), authReq.body);
            res.status(201).json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateResource(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = getHospitalId(authReq.user);
            if (!hospitalId)
                throw Object.assign(new Error('Hospital ID not found in authentication context.'), { statusCode: 400 });
            const data = await PatientService.updateEHRResource(hospitalId, actor(authReq), authReq.params.resourceType, authReq.params.resourceId, authReq.body);
            res.status(200).json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    static async versions(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = getHospitalId(authReq.user);
            if (!hospitalId)
                throw Object.assign(new Error('Hospital ID not found in authentication context.'), { statusCode: 400 });
            const data = await PatientService.getResourceVersions(hospitalId, req.params.id, req.params.resourceType, req.params.resourceId, actor(authReq));
            res.status(200).json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    static async duplicates(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = getHospitalId(authReq.user);
            if (!hospitalId)
                throw Object.assign(new Error('Hospital ID not found in authentication context.'), { statusCode: 400 });
            const data = await PatientService.findDuplicatePatients(hospitalId, authReq.body || req.query);
            res.status(200).json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    static async merge(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = getHospitalId(authReq.user);
            if (!hospitalId)
                throw Object.assign(new Error('Hospital ID not found in authentication context.'), { statusCode: 400 });
            const data = await PatientService.mergePatients(hospitalId, actor(authReq), req.params.id, authReq.body.targetPatientId, authReq.body.reason);
            res.status(200).json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    static async createConsent(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = getHospitalId(authReq.user);
            if (!hospitalId)
                throw Object.assign(new Error('Hospital ID not found in authentication context.'), { statusCode: 400 });
            const data = await PatientService.createConsent(hospitalId, actor(authReq), authReq.body);
            res.status(201).json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    static async revokeConsent(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = getHospitalId(authReq.user);
            if (!hospitalId)
                throw Object.assign(new Error('Hospital ID not found in authentication context.'), { statusCode: 400 });
            const data = await PatientService.revokeConsent(hospitalId, req.params.consentId, actor(authReq));
            res.status(200).json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
}
