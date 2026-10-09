import { PatientAssignmentService } from './patient-assignment.service.js';
function auth(req) {
    const user = req.user;
    const hospitalId = user?.hospitalId || user?.accountId;
    const userId = user?._id;
    if (!hospitalId || !userId) {
        throw Object.assign(new Error('Authenticated hospital context is missing.'), { statusCode: 401 });
    }
    return {
        userId: String(userId),
        hospitalId: String(hospitalId),
        userType: user?.userType === 'STAFF' ? 'STAFF' : 'ACCOUNT',
    };
}
export class PatientAssignmentController {
    static async create(req, res, next) {
        try {
            const context = auth(req);
            const data = await PatientAssignmentService.createAssignment(context.hospitalId, context.userId, context.userType, req.body);
            res.status(201).json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    static async listMine(req, res, next) {
        try {
            const context = auth(req);
            const staffId = await PatientAssignmentService.resolveStaffId(context.userId, context.hospitalId);
            const data = await PatientAssignmentService.listMyPatients(context.hospitalId, String(staffId), req.query);
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    static async listPatientAssignments(req, res, next) {
        try {
            const context = auth(req);
            const data = await PatientAssignmentService.listPatientAssignments(context.hospitalId, req.params.patientId);
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    static async getMyPatient(req, res, next) {
        try {
            const context = auth(req);
            const staffId = await PatientAssignmentService.resolveStaffId(context.userId, context.hospitalId);
            const data = await PatientAssignmentService.getMyPatient(context.hospitalId, String(staffId), req.params.patientId);
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    static async getById(req, res, next) {
        try {
            const context = auth(req);
            const data = await PatientAssignmentService.getAssignmentById(context.hospitalId, req.params.id);
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    static async syncAppointments(req, res, next) {
        try {
            const context = auth(req);
            const data = await PatientAssignmentService.syncAppointmentAssignments(context.hospitalId);
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    static async update(req, res, next) {
        try {
            const context = auth(req);
            const data = await PatientAssignmentService.endAssignment(context.hospitalId, req.params.id, req.body);
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
}
