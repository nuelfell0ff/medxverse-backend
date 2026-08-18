import { surgeryService } from './surgery.service.js';
import { UrgencyLevel, } from './surgery.types.js';
export class SurgeryController {
    parseTeamMembers(rawTeam) {
        if (!Array.isArray(rawTeam))
            return [];
        return rawTeam
            .filter((member) => member && typeof member === 'object')
            .map((member) => ({
            userId: member.userId,
            role: member.role,
            credentialVerified: Boolean(member.credentialVerified),
            notes: member.notes || '',
        }));
    }
    async scheduleCase(req, res, next) {
        try {
            const authReq = req;
            const leadSurgeonId = req.body.leadSurgeonId;
            if (!leadSurgeonId) {
                res.status(400).json({
                    success: false,
                    message: 'leadSurgeonId is required.',
                });
                return;
            }
            const surgeryCase = await surgeryService.scheduleCase(authReq.user.hospitalId, authReq.user._id, {
                patientId: req.body.patientId,
                leadSurgeonId,
                theatreId: req.body.theatreId,
                procedureName: req.body.procedureName,
                icdCode: req.body.icdCode,
                urgency: req.body.urgency,
                priority: req.body.priority,
                scheduledStartTime: new Date(req.body.scheduledStartTime),
                scheduledEndTime: new Date(req.body.scheduledEndTime),
                anesthesiaType: req.body.anesthesiaType,
                surgicalTeam: this.parseTeamMembers(req.body.surgicalTeam),
                estimatedDurationMinutes: req.body.estimatedDurationMinutes,
            });
            res.status(201).json({
                success: true,
                data: surgeryCase,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async scheduleEmergencyCase(req, res, next) {
        try {
            const authReq = req;
            const leadSurgeonId = req.body.leadSurgeonId;
            if (!leadSurgeonId) {
                res.status(400).json({
                    success: false,
                    message: 'leadSurgeonId is required for emergency surgery.',
                });
                return;
            }
            const surgeryCase = await surgeryService.insertEmergencyCase(authReq.user.hospitalId, authReq.user._id, {
                patientId: req.body.patientId,
                leadSurgeonId,
                theatreId: req.body.theatreId,
                procedureName: req.body.procedureName,
                icdCode: req.body.icdCode,
                urgency: UrgencyLevel.EMERGENCY,
                priority: req.body.priority ?? 100,
                scheduledStartTime: new Date(req.body.scheduledStartTime),
                scheduledEndTime: new Date(req.body.scheduledEndTime),
                anesthesiaType: req.body.anesthesiaType,
                surgicalTeam: this.parseTeamMembers(req.body.surgicalTeam),
                estimatedDurationMinutes: req.body.estimatedDurationMinutes,
            });
            res.status(201).json({
                success: true,
                data: surgeryCase,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getCases(req, res, next) {
        try {
            const authReq = req;
            const result = await surgeryService.getCases(authReq.user.hospitalId, {
                page: req.query.page ? Number(req.query.page) : 1,
                limit: req.query.limit ? Number(req.query.limit) : 20,
                status: req.query.status,
                urgency: req.query.urgency,
                theatreId: req.query.theatreId,
                leadSurgeonId: req.query.leadSurgeonId,
                patientId: req.query.patientId,
                date: req.query.date,
            });
            res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getCaseById(req, res, next) {
        try {
            const authReq = req;
            const surgeryCase = await surgeryService.getCaseById(req.params.id, authReq.user.hospitalId);
            if (!surgeryCase) {
                res.status(404).json({
                    success: false,
                    message: 'Surgical case not found.',
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: surgeryCase,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updatePreOp(req, res, next) {
        try {
            const authReq = req;
            const updated = await surgeryService.updatePreOpAssessment(req.params.id, authReq.user.hospitalId, authReq.user._id, req.body);
            if (!updated) {
                res.status(404).json({
                    success: false,
                    message: 'Surgical case not found.',
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateConsent(req, res, next) {
        try {
            const authReq = req;
            const updated = await surgeryService.updateConsent(req.params.id, authReq.user.hospitalId, authReq.user._id, req.body);
            if (!updated) {
                res.status(404).json({
                    success: false,
                    message: 'Surgical case not found.',
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateTeam(req, res, next) {
        try {
            const authReq = req;
            const updated = await surgeryService.updateTeam(req.params.id, authReq.user.hospitalId, authReq.user._id, req.body);
            if (!updated) {
                res.status(404).json({
                    success: false,
                    message: 'Surgical case not found.',
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async rescheduleCase(req, res, next) {
        try {
            const authReq = req;
            const updated = await surgeryService.rescheduleCase(req.params.id, authReq.user.hospitalId, authReq.user._id, {
                scheduledStartTime: new Date(req.body.scheduledStartTime),
                scheduledEndTime: new Date(req.body.scheduledEndTime),
                theatreId: req.body.theatreId,
                reason: req.body.reason,
            });
            if (!updated) {
                res.status(404).json({
                    success: false,
                    message: 'Surgical case not found.',
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async addMedication(req, res, next) {
        try {
            const authReq = req;
            const updated = await surgeryService.updateMedication(req.params.id, authReq.user.hospitalId, req.body);
            if (!updated) {
                res.status(404).json({
                    success: false,
                    message: 'Surgical case not found.',
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async administerMedication(req, res, next) {
        try {
            const authReq = req;
            const updated = await surgeryService.administerMedication(req.params.id, authReq.user.hospitalId, authReq.user._id, req.body);
            if (!updated) {
                res.status(404).json({
                    success: false,
                    message: 'Medication or surgical case not found.',
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateWHOChecklist(req, res, next) {
        try {
            const authReq = req;
            const updated = await surgeryService.updateWHOChecklist(req.params.id, authReq.user.hospitalId, authReq.user._id, req.body);
            if (!updated) {
                res.status(404).json({
                    success: false,
                    message: 'Surgical case not found.',
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async addVitalsLog(req, res, next) {
        try {
            const authReq = req;
            const updated = await surgeryService.addVitalsLog(req.params.id, authReq.user.hospitalId, authReq.user._id, req.body);
            if (!updated) {
                res.status(404).json({
                    success: false,
                    message: 'Surgical case not found.',
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async startSurgery(req, res, next) {
        try {
            const authReq = req;
            const updated = await surgeryService.startSurgery(req.params.id, authReq.user.hospitalId, authReq.user._id);
            if (!updated) {
                res.status(404).json({
                    success: false,
                    message: 'Surgical case not found or cannot be started.',
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateIntraopDocs(req, res, next) {
        try {
            const authReq = req;
            const updated = await surgeryService.updateIntraopDocs(req.params.id, authReq.user.hospitalId, authReq.user._id, req.body);
            if (!updated) {
                res.status(404).json({
                    success: false,
                    message: 'Surgical case not found or surgery is not in progress.',
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateAnesthesia(req, res, next) {
        try {
            const authReq = req;
            const updated = await surgeryService.updateAnesthesia(req.params.id, authReq.user.hospitalId, authReq.user._id, req.body);
            if (!updated) {
                res.status(404).json({
                    success: false,
                    message: 'Surgical case not found.',
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async completeSurgery(req, res, next) {
        try {
            const authReq = req;
            const updated = await surgeryService.completeSurgery(req.params.id, authReq.user.hospitalId, authReq.user._id, req.body);
            if (!updated) {
                res.status(404).json({
                    success: false,
                    message: 'Surgical case not found or surgery is not in progress.',
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateRecovery(req, res, next) {
        try {
            const authReq = req;
            const updated = await surgeryService.updateRecovery(req.params.id, authReq.user.hospitalId, authReq.user._id, req.body);
            if (!updated) {
                res.status(404).json({
                    success: false,
                    message: 'Surgical case not found or not currently in recovery.',
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async cancelCase(req, res, next) {
        try {
            const authReq = req;
            const updated = await surgeryService.cancelCase(req.params.id, authReq.user.hospitalId, authReq.user._id, req.body.cancellationReason || 'No reason specified.');
            if (!updated) {
                res.status(404).json({
                    success: false,
                    message: 'Surgical case not found.',
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async postponeCase(req, res, next) {
        try {
            const authReq = req;
            const updated = await surgeryService.postponeCase(req.params.id, authReq.user.hospitalId, authReq.user._id, req.body.reason || 'No reason specified.');
            if (!updated) {
                res.status(404).json({
                    success: false,
                    message: 'Surgical case not found.',
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
export const surgeryController = new SurgeryController();
