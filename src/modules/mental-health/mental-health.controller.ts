import { Request, Response, NextFunction } from 'express';
import { mentalHealthService } from './mental-health.service.js';
import {
  AssessmentType,
  SeverityLevel,
  SuicideRiskLevel,
  SessionType,
  SessionStatus,
} from './mental-health.types.js';

export interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    hospitalId: string;
    [key: string]: unknown;
  };
}

export class MentalHealthController {
  public async createAssessment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const evaluatorId = authReq.user._id;

      const {
        patientId,
        assessmentType,
        totalScore,
        severityLevel,
        suicideRiskLevel,
        mentalStatusExam,
        questionnaireAnswers,
        clinicalSummary,
        recommendations,
      } = req.body;

      const assessment = await mentalHealthService.createAssessment({
        hospitalId,
        patientId,
        evaluatorId,
        assessmentType: assessmentType as AssessmentType,
        totalScore,
        severityLevel: severityLevel as SeverityLevel,
        suicideRiskLevel: suicideRiskLevel as SuicideRiskLevel,
        mentalStatusExam,
        questionnaireAnswers,
        clinicalSummary,
        recommendations,
      });

      res.status(201).json({ success: true, data: assessment });
    } catch (error) {
      next(error);
    }
  }

  public async getAssessments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const patientId = req.query.patientId as string | undefined;
      const evaluatorId = req.query.evaluatorId as string | undefined;
      const assessmentType = req.query.assessmentType as AssessmentType | undefined;
      const suicideRiskLevel = req.query.suicideRiskLevel as SuicideRiskLevel | undefined;

      const result = await mentalHealthService.getAssessments(hospitalId, {
        page,
        limit,
        patientId,
        evaluatorId,
        assessmentType,
        suicideRiskLevel,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public async getAssessmentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const id = req.params.id as string;

      const assessment = await mentalHealthService.getAssessmentById(id, hospitalId);

      if (!assessment) {
        res.status(404).json({ success: false, message: 'Mental health assessment not found' });
        return;
      }

      res.status(200).json({ success: true, data: assessment });
    } catch (error) {
      next(error);
    }
  }

  public async createSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const therapistId = authReq.user._id;

      const {
        patientId,
        assessmentId,
        sessionType,
        status,
        sessionDate,
        durationMinutes,
        subjectiveNotes,
        objectiveNotes,
        interventionsUsed,
        treatmentGoalsAddressed,
        safetyPlanReviewed,
        nextSessionDate,
        notes,
      } = req.body;

      const session = await mentalHealthService.createSession({
        hospitalId,
        patientId,
        therapistId,
        assessmentId,
        sessionType: sessionType as SessionType,
        status: status as SessionStatus,
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
    } catch (error) {
      next(error);
    }
  }

  public async getSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const patientId = req.query.patientId as string | undefined;
      const therapistId = req.query.therapistId as string | undefined;
      const sessionType = req.query.sessionType as SessionType | undefined;
      const status = req.query.status as SessionStatus | undefined;

      const result = await mentalHealthService.getSessions(hospitalId, {
        page,
        limit,
        patientId,
        therapistId,
        sessionType,
        status,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public async getSessionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const id = req.params.id as string;

      const session = await mentalHealthService.getSessionById(id, hospitalId);

      if (!session) {
        res.status(404).json({ success: false, message: 'Psychotherapy session record not found' });
        return;
      }

      res.status(200).json({ success: true, data: session });
    } catch (error) {
      next(error);
    }
  }
}

export const mentalHealthController = new MentalHealthController();