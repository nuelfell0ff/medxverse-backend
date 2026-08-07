import { Document, Types } from 'mongoose';

export enum AssessmentType {
  PHQ9 = 'PHQ9', // Patient Health Questionnaire (Depression)
  GAD7 = 'GAD7', // Generalized Anxiety Disorder
  BDI = 'BDI', // Beck Depression Inventory
  CSSRS = 'CSSRS', // Columbia-Suicide Severity Rating Scale
  MSE = 'MSE', // Mental Status Examination
  CUSTOM_PSYCH_EVAL = 'CUSTOM_PSYCH_EVAL',
}

export enum SeverityLevel {
  NONE = 'NONE',
  MINIMAL = 'MINIMAL',
  MILD = 'MILD',
  MODERATE = 'MODERATE',
  MODERATELY_SEVERE = 'MODERATELY_SEVERE',
  SEVERE = 'SEVERE',
}

export enum SuicideRiskLevel {
  NONE = 'NONE',
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum SessionType {
  INDIVIDUAL_THERAPY = 'INDIVIDUAL_THERAPY',
  GROUP_THERAPY = 'GROUP_THERAPY',
  FAMILY_THERAPY = 'FAMILY_THERAPY',
  CBT = 'CBT', // Cognitive Behavioral Therapy
  DBT = 'DBT', // Dialectical Behavior Therapy
  PSYCHIATRIC_EVALUATION = 'PSYCHIATRIC_EVALUATION',
  MEDICATION_MANAGEMENT = 'MEDICATION_MANAGEMENT',
}

export enum SessionStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export interface IMentalStatusExam {
  appearance?: string; // e.g., Well-groomed, disheveled
  behavior?: string; // e.g., Cooperative, agitated
  speech?: string; // e.g., Normal rate, pressured
  mood?: string; // e.g., Euthymic, depressed, anxious
  affect?: string; // e.g., Appropriate, flat, labile
  thoughtProcess?: string; // e.g., Logical, flight of ideas
  thoughtContent?: string; // e.g., Delusions, obsessions, suicidal ideation
  cognition?: string; // e.g., Alert, oriented x3
  insightAndJudgment?: string; // e.g., Good, fair, poor
}

export interface IMentalHealthAssessment {
  hospitalId: Types.ObjectId;
  patientId: Types.ObjectId;
  evaluatorId: Types.ObjectId;
  assessmentType: AssessmentType;
  totalScore?: number;
  severityLevel?: SeverityLevel;
  suicideRiskLevel: SuicideRiskLevel;
  mentalStatusExam?: IMentalStatusExam;
  questionnaireAnswers?: Array<{
    questionId: string;
    questionText: string;
    score: number;
  }>;
  clinicalSummary?: string;
  recommendations?: string;
}

export interface IMentalHealthAssessmentDocument extends IMentalHealthAssessment, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IPsychotherapySession {
  hospitalId: Types.ObjectId;
  patientId: Types.ObjectId;
  therapistId: Types.ObjectId;
  assessmentId?: Types.ObjectId;
  sessionType: SessionType;
  status: SessionStatus;
  sessionDate: Date;
  durationMinutes: number;
  subjectiveNotes?: string; // Patient's self-reported feelings/concerns
  objectiveNotes?: string; // Therapist's observations
  interventionsUsed?: string[]; // e.g., Reframing, Exposure, Mindfulness
  treatmentGoalsAddressed?: string[];
  safetyPlanReviewed: boolean;
  nextSessionDate?: Date;
  notes?: string;
}

export interface IPsychotherapySessionDocument extends IPsychotherapySession, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAssessmentInput {
  hospitalId: string;
  patientId: string;
  evaluatorId: string;
  assessmentType: AssessmentType;
  totalScore?: number;
  severityLevel?: SeverityLevel;
  suicideRiskLevel: SuicideRiskLevel;
  mentalStatusExam?: IMentalStatusExam;
  questionnaireAnswers?: Array<{
    questionId: string;
    questionText: string;
    score: number;
  }>;
  clinicalSummary?: string;
  recommendations?: string;
}

export interface CreateSessionInput {
  hospitalId: string;
  patientId: string;
  therapistId: string;
  assessmentId?: string;
  sessionType: SessionType;
  status?: SessionStatus;
  sessionDate: Date;
  durationMinutes: number;
  subjectiveNotes?: string;
  objectiveNotes?: string;
  interventionsUsed?: string[];
  treatmentGoalsAddressed?: string[];
  safetyPlanReviewed?: boolean;
  nextSessionDate?: Date;
  notes?: string;
}

export interface GetAssessmentsQuery {
  page?: number;
  limit?: number;
  patientId?: string;
  evaluatorId?: string;
  assessmentType?: AssessmentType;
  suicideRiskLevel?: SuicideRiskLevel;
}

export interface GetSessionsQuery {
  page?: number;
  limit?: number;
  patientId?: string;
  therapistId?: string;
  sessionType?: SessionType;
  status?: SessionStatus;
}