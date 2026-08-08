import { dentalService } from './dental.service.js';
export class DentalController {
    async upsertDentalChart(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const dentistId = authReq.user._id;
            const { patientId, teeth, overallPeriodontalHealth, notes } = req.body;
            const chart = await dentalService.upsertDentalChart({
                hospitalId,
                patientId,
                dentistId,
                teeth,
                overallPeriodontalHealth,
                notes,
            });
            res.status(200).json({ success: true, data: chart });
        }
        catch (error) {
            next(error);
        }
    }
    async getPatientDentalChart(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const patientId = req.params.patientId;
            const chart = await dentalService.getPatientDentalChart(patientId, hospitalId);
            if (!chart) {
                res.status(404).json({ success: false, message: 'Dental chart not found for patient' });
                return;
            }
            res.status(200).json({ success: true, data: chart });
        }
        catch (error) {
            next(error);
        }
    }
    async createDentalProcedure(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const dentistId = authReq.user._id;
            const { patientId, procedureType, toothNumber, surfaces, status, cost, performedAt, clinicalNotes } = req.body;
            const procedure = await dentalService.createDentalProcedure({
                hospitalId,
                patientId,
                dentistId,
                procedureType: procedureType,
                toothNumber,
                surfaces,
                status: status,
                cost,
                performedAt,
                clinicalNotes,
            });
            res.status(201).json({ success: true, data: procedure });
        }
        catch (error) {
            next(error);
        }
    }
    async getDentalProcedures(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
            const patientId = req.query.patientId;
            const dentistId = req.query.dentistId;
            const procedureType = req.query.procedureType;
            const status = req.query.status;
            const toothNumber = req.query.toothNumber
                ? parseInt(req.query.toothNumber, 10)
                : undefined;
            const result = await dentalService.getDentalProcedures(hospitalId, {
                page,
                limit,
                patientId,
                dentistId,
                procedureType,
                status,
                toothNumber,
            });
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async updateProcedureStatus(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const id = req.params.id;
            const { status, clinicalNotes, cost } = req.body;
            const updated = await dentalService.updateProcedureStatus(id, hospitalId, {
                status: status,
                clinicalNotes,
                cost,
            });
            if (!updated) {
                res.status(404).json({ success: false, message: 'Dental procedure record not found' });
                return;
            }
            res.status(200).json({ success: true, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
}
export const dentalController = new DentalController();
