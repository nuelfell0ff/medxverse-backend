import { Schema, model } from 'mongoose';
import {
  IMentalHealthAssessmentDocument,
  IPsychotherapySessionDocument,
  AssessmentType,
  SeverityLevel,
  SuicideRiskLevel,
  SessionType,
  SessionStatus,
} from './mental-health.types.js';

const MentalStatusExamSchema = new Schema(
  {
    appearance: { type: String, trim: true },
    behavior: { type: String, trim: true },
    speech: { type: String, trim: true },
    mood: { type: String, trim: true },
    affect: { type: String, trim: true },
    thoughtProcess: { type: String, trim: true },
    thoughtContent: { type: String, trim: true },
    cognition: { type: String, trim: true },
    insightAndJudgment: { type: String, trim: true },
  },
  { _id: false }
);

const MentalHealthAssessmentSchema = new Schema<IMentalHealthAssessmentDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    evaluatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assessmentType: {
      type: String,
      enum: Object.values(AssessmentType),
      required: true,
      index: true,
    },
    totalScore: { type: Number },
    severityLevel: {
      type: String,
      enum: Object.values(SeverityLevel),
    },
    suicideRiskLevel: {
      type: String,
      enum: Object.values(SuicideRiskLevel),
      required: true,
      default: SuicideRiskLevel.NONE,
      index: true,
    },
    mentalStatusExam: { type: MentalStatusExamSchema },
    questionnaireAnswers: [
      {
        questionId: { type: String, required: true },
        questionText: { type: String, required: true },
        score: { type: Number, required: true },
      },
    ],
    clinicalSummary: { type: String, trim: true },
    recommendations: { type: String, trim: true },
  },
  { timestamps: true }
);

MentalHealthAssessmentSchema.index({ hospitalId: 1, patientId: 1, createdAt: -1 });

export const MentalHealthAssessmentModel = model<IMentalHealthAssessmentDocument>(
  'MentalHealthAssessment',
  MentalHealthAssessmentSchema
);

const PsychotherapySessionSchema = new Schema<IPsychotherapySessionDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    therapistId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assessmentId: { type: Schema.Types.ObjectId, ref: 'MentalHealthAssessment', index: true },
    sessionType: {
      type: String,
      enum: Object.values(SessionType),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(SessionStatus),
      default: SessionStatus.SCHEDULED,
      index: true,
    },
    sessionDate: { type: Date, required: true, index: true },
    durationMinutes: { type: Number, required: true, min: 1 },
    subjectiveNotes: { type: String, trim: true },
    objectiveNotes: { type: String, trim: true },
    interventionsUsed: [{ type: String, trim: true }],
    treatmentGoalsAddressed: [{ type: String, trim: true }],
    safetyPlanReviewed: { type: Boolean, default: false },
    nextSessionDate: { type: Date },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

PsychotherapySessionSchema.index({ hospitalId: 1, patientId: 1, sessionDate: -1 });

export const PsychotherapySessionModel = model<IPsychotherapySessionDocument>(
  'PsychotherapySession',
  PsychotherapySessionSchema
);