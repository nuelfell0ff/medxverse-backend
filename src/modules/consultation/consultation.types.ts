import { Document, Types } from 'mongoose';

export enum EncounterType {
  CLINIC_VISIT = 'CLINIC_VISIT',
  EMERGENCY = 'EMERGENCY',
  WARD_ROUND = 'WARD_ROUND',
  TELEHEALTH = 'TELEHEALTH',
  FOLLOW_UP = 'FOLLOW_UP',
}

export enum ConsultationStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  AMENDED = 'AMENDED',
  CANCELLED = 'CANCELLED',
}

export enum DiagnosisType {
  PRIMARY = 'PRIMARY',
  SECONDARY = 'SECONDARY',
  DIFFERENTIAL = 'DIFFERENTIAL',
}

export interface IDiagnosis {
  code?: string; // ICD-10 or internal code
  description: string;
  type: DiagnosisType;
}

export interface IPrescriptionItem {
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface ILabOrderItem {
  testName: string;
  notes?: string;
}

export interface IConsultation {
  hospitalId: Types.ObjectId;
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId;
  appointmentId?: Types.ObjectId;
  encounterType: EncounterType;
  status: ConsultationStatus;
  chiefComplaint: string;
  historyOfPresentIllness?: string;
  physicalExamination?: string;
  diagnoses: IDiagnosis[];
  treatmentPlan?: string;
  prescriptions: IPrescriptionItem[];
  labOrders: ILabOrderItem[];
  followUpDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IConsultationDocument extends IConsultation, Document {
  _id: Types.ObjectId;
}

export interface CreateConsultationDTO {
  patientId: string;
  appointmentId?: string;
  encounterType?: EncounterType;
  chiefComplaint: string;
  historyOfPresentIllness?: string;
  physicalExamination?: string;
  diagnoses?: IDiagnosis[];
  treatmentPlan?: string;
  prescriptions?: IPrescriptionItem[];
  labOrders?: ILabOrderItem[];
  followUpDate?: string;
}

export interface UpdateConsultationDTO {
  chiefComplaint?: string;
  historyOfPresentIllness?: string;
  physicalExamination?: string;
  diagnoses?: IDiagnosis[];
  treatmentPlan?: string;
  prescriptions?: IPrescriptionItem[];
  labOrders?: ILabOrderItem[];
  followUpDate?: string;
  status?: ConsultationStatus;
}

export interface GetConsultationsQueryDTO {
  patientId?: string;
  doctorId?: string;
  status?: ConsultationStatus;
  encounterType?: EncounterType;
  page?: string;
  limit?: string;
}