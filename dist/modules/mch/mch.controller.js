import { mchService } from './mch.service.js';
export class MchController {
    async createRecord(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const { patientId, careType, gravida, para, estimatedDeliveryDate, lastMenstrualPeriod } = req.body;
            const record = await mchService.createRecord({
                hospitalId,
                patientId,
                careType: careType,
                gravida,
                para,
                estimatedDeliveryDate: estimatedDeliveryDate ? new Date(estimatedDeliveryDate) : undefined,
                lastMenstrualPeriod: lastMenstrualPeriod ? new Date(lastMenstrualPeriod) : undefined,
            });
            res.status(201).json({ success: true, data: record });
        }
        catch (error) {
            next(error);
        }
    }
    async getRecords(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
            const careType = req.query.careType;
            const patientId = req.query.patientId;
            const pregnancyStatus = req.query.pregnancyStatus;
            const result = await mchService.getRecords(hospitalId, {
                page,
                limit,
                careType,
                patientId,
                pregnancyStatus,
            });
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async getRecordById(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const id = req.params.id;
            const record = await mchService.getRecordById(id, hospitalId);
            if (!record) {
                res.status(404).json({ success: false, message: 'MCH record not found' });
                return;
            }
            res.status(200).json({ success: true, data: record });
        }
        catch (error) {
            next(error);
        }
    }
    async addAncVisit(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const attendingStaffId = authReq.user._id;
            const id = req.params.id;
            const { gestationalAgeWeeks, weightKg, bloodPressure, fundalHeightCm, fetalHeartRateBpm, fetalPosition, urineProtein, urineSugar, hemoglobinGdl, notes, } = req.body;
            const updated = await mchService.addAncVisit(id, hospitalId, {
                gestationalAgeWeeks,
                weightKg,
                bloodPressure,
                fundalHeightCm,
                fetalHeartRateBpm,
                fetalPosition,
                urineProtein,
                urineSugar,
                hemoglobinGdl,
                notes,
                attendingStaffId,
            });
            if (!updated) {
                res.status(404).json({ success: false, message: 'MCH record not found' });
                return;
            }
            res.status(200).json({ success: true, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
    async recordDelivery(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const deliveredBy = authReq.user._id;
            const id = req.params.id;
            const { deliveryDate, deliveryType, outcome, birthWeightKg, apgarScore1Min, apgarScore5Min, infantGender, complications, notes, } = req.body;
            const updated = await mchService.recordDelivery(id, hospitalId, {
                deliveryDate,
                deliveryType: deliveryType,
                outcome: outcome,
                birthWeightKg,
                apgarScore1Min,
                apgarScore5Min,
                infantGender,
                complications,
                deliveredBy,
                notes,
            });
            if (!updated) {
                res.status(404).json({ success: false, message: 'MCH record not found' });
                return;
            }
            res.status(200).json({ success: true, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
    async addImmunization(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const administeredBy = authReq.user._id;
            const id = req.params.id;
            const { vaccineName, doseNumber, batchNumber, nextDueDate, notes } = req.body;
            const updated = await mchService.addImmunization(id, hospitalId, {
                vaccineName,
                doseNumber,
                administeredBy,
                batchNumber,
                nextDueDate,
                notes,
            });
            if (!updated) {
                res.status(404).json({ success: false, message: 'MCH record not found' });
                return;
            }
            res.status(200).json({ success: true, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
}
export const mchController = new MchController();
