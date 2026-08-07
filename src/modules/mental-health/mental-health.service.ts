import { Types } from 'mongoose';
import { MentalHealthAssessmentModel, PsychotherapySessionModel } from './mental-health.model.js';
import {
  CreateAssessmentInput,
  CreateSessionInput,
  GetAssessmentsQuery,
  GetSessionsQuery,
  IMentalHealthAssessmentDocument,
  IPsychotherapySessionDocument,
} from './mental-health.types.js';

export class MentalHealthService {
  public async createAssessment(
    input: CreateAssessmentInput
  ): Promise<IMentalHealthAssessmentDocument> {
    return MentalHealthAssessmentModel.create({
      ...input,
      hospitalId: new Types.ObjectId(input.hospitalId),
      patientId: new Types.ObjectId(input.patientId),
      evaluatorId: new Types.ObjectId(input.evaluatorId),
    });
  }

  public async getAssessments(
    hospitalId: string,
    query: GetAssessmentsQuery
  ): Promise<{
    assessments: IMentalHealthAssessmentDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { hospitalId };

    if (query.patientId) filter.patientId = query.patientId;
    if (query.evaluatorId) filter.evaluatorId = query.evaluatorId;
    if (query.assessmentType) filter.assessmentType = query.assessmentType;
    if (query.suicideRiskLevel) filter.suicideRiskLevel = query.suicideRiskLevel;

    const [assessments, total] = await Promise.all([
      MentalHealthAssessmentModel.find(filter)
        .populate('patientId', 'firstName lastName mrn dateOfBirth gender')
        .populate('evaluatorId', 'firstName lastName role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      MentalHealthAssessmentModel.countDocuments(filter),
    ]);

    return {
      assessments,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  public async getAssessmentById(
    assessmentId: string,
    hospitalId: string
  ): Promise<IMentalHealthAssessmentDocument | null> {
    return MentalHealthAssessmentModel.findOne({ _id: assessmentId, hospitalId })
      .populate('patientId', 'firstName lastName mrn dateOfBirth gender phone')
      .populate('evaluatorId', 'firstName lastName role')
      .exec();
  }

  public async createSession(input: CreateSessionInput): Promise<IPsychotherapySessionDocument> {
    return PsychotherapySessionModel.create({
      ...input,
      hospitalId: new Types.ObjectId(input.hospitalId),
      patientId: new Types.ObjectId(input.patientId),
      therapistId: new Types.ObjectId(input.therapistId),
      assessmentId: input.assessmentId ? new Types.ObjectId(input.assessmentId) : undefined,
      sessionDate: new Date(input.sessionDate),
      nextSessionDate: input.nextSessionDate ? new Date(input.nextSessionDate) : undefined,
    });
  }

  public async getSessions(
    hospitalId: string,
    query: GetSessionsQuery
  ): Promise<{
    sessions: IPsychotherapySessionDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { hospitalId };

    if (query.patientId) filter.patientId = query.patientId;
    if (query.therapistId) filter.therapistId = query.therapistId;
    if (query.sessionType) filter.sessionType = query.sessionType;
    if (query.status) filter.status = query.status;

    const [sessions, total] = await Promise.all([
      PsychotherapySessionModel.find(filter)
        .populate('patientId', 'firstName lastName mrn dateOfBirth gender')
        .populate('therapistId', 'firstName lastName role')
        .populate('assessmentId', 'assessmentType totalScore suicideRiskLevel')
        .sort({ sessionDate: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      PsychotherapySessionModel.countDocuments(filter),
    ]);

    return {
      sessions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  public async getSessionById(
    sessionId: string,
    hospitalId: string
  ): Promise<IPsychotherapySessionDocument | null> {
    return PsychotherapySessionModel.findOne({ _id: sessionId, hospitalId })
      .populate('patientId', 'firstName lastName mrn dateOfBirth gender phone')
      .populate('therapistId', 'firstName lastName role')
      .populate('assessmentId')
      .exec();
  }
}

export const mentalHealthService = new MentalHealthService();