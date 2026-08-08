import { mentalHealthService } from './mental-health.service.js';
export class MentalHealthController {
    async createAssessment(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const evaluatorId = authReq.user._id;
            const { patientId, assessmentType, totalScore, severityLevel, suicideRiskLevel, mentalStatusExam, questionnaireAnswers, clinicalSummary, recommendations, } = req.body;
            const assessment = await mentalHealthService.createAssessment({
                hospitalId,
                patientId,
                evaluatorId,
                assessmentType: assessmentType,
                totalScore,
                severityLevel: severityLevel,
                suicideRiskLevel: suicideRiskLevel,
                mentalStatusExam,
                questionnaireAnswers,
                clinicalSummary,
                recommendations,
            });
            res.status(201).json({ success: true, data: assessment });
        }
        catch (error) {
            next(error);
        }
    }
    async getAssessments(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
            const patientId = req.query.patientId;
            const evaluatorId = req.query.evaluatorId;
            const assessmentType = req.query.assessmentType;
            const suicideRiskLevel = req.query.suicideRiskLevel;
            const result = await mentalHealthService.getAssessments(hospitalId, {
                page,
                limit,
                patientId,
                evaluatorId,
                assessmentType,
                suicideRiskLevel,
            });
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async getAssessmentById(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const id = req.params.id;
            const assessment = await mentalHealthService.getAssessmentById(id, hospitalId);
            if (!assessment) {
                res.status(404).json({ success: false, message: 'Mental health assessment not found' });
                return;
            }
            res.status(200).json({ success: true, data: assessment });
        }
        catch (error) {
            next(error);
        }
    }
    async createSession(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const therapistId = authReq.user._id;
            const { patientId, assessmentId, sessionType, status, sessionDate, durationMinutes, subjectiveNotes, objectiveNotes, interventionsUsed, treatmentGoalsAddressed, safetyPlanReviewed, nextSessionDate, notes, } = req.body;
            const session = await mentalHealthService.createSession({
                hospitalId,
                patientId,
                therapistId,
                assessmentId,
                sessionType: sessionType,
                status: status,
                sessionDate,
                durationMinutes,
                subjectiveNotes,
                objectiveNotes,
                interventionsUsed,
                treatmentGoalsAddressed,
                safetyPlanReviewed,
                nextSessionDate,
                notes,
            });
            res.status(201).json({ success: true, data: session });
        }
        catch (error) {
            next(error);
        }
    }
    async getSessions(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
            const patientId = req.query.patientId;
            const therapistId = req.query.therapistId;
            const sessionType = req.query.sessionType;
            const status = req.query.status;
            const result = await mentalHealthService.getSessions(hospitalId, {
                page,
                limit,
                patientId,
                therapistId,
                sessionType,
                status,
            });
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async getSessionById(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const id = req.params.id;
            const session = await mentalHealthService.getSessionById(id, hospitalId);
            if (!session) {
                res.status(404).json({ success: false, message: 'Psychotherapy session record not found' });
                return;
            }
            res.status(200).json({ success: true, data: session });
        }
        catch (error) {
            next(error);
        }
    }
}
export const mentalHealthController = new MentalHealthController();
