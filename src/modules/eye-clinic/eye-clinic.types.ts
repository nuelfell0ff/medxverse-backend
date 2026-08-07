import { Document, Types } from 'mongoose';

export enum EyeSide {
  OD = 'OD', // Oculus Dexter (Right Eye)
  OS = 'OS', // Oculus Sinister (Left Eye)
  OU = 'OU', // Oculi Uterque (Both Eyes)
}

export enum ExamType {
  COMPREHENSIVE = 'COMPREHENSIVE',
  REFRACTION = 'REFRACTION',
  GLAUCOMA_SCREENING = 'GLAUCOMA_SCREENING',
  CATARACT_EVALUATION = 'CATARACT_EVALUATION',
  RETINAL_EXAM = 'RETINAL_EXAM',
  CORNEAL_TOPOGRAPHY = 'CORNEAL_TOPOGRAPHY',
  CONTACT_LENS_FITTING = 'CONTACT_LENS_FITTING',
}

export enum PrescriptionType {
  GLASSES = 'GLASSES',
  CONTACT_LENSES = 'CONTACT_LENSES',
}

export enum LensType {
  SINGLE_VISION = 'SINGLE_VISION',
  BIFOCAL = 'BIFOCAL',
  PROGRESSIVE = 'PROGRESSIVE',
  TORIC = 'TORIC',
  MULTIFOCAL = 'MULTIFOCAL',
}

export interface IRefractionData {
  sphere?: number;
  cylinder?: number;
  axis?: number;
  add?: number;
  visualAcuity?: string;
}

export interface IEyeRefraction {
  rightEye: IRefractionData;
  leftEye: IRefractionData;
  pupillaryDistanceMm?: number;
}

export interface ITonometry {
  iopRightEyeMmHg?: number;
  iopLeftEyeMmHg?: number;
  measurementTime?: Date;
  method?: string; // e.g., 'Goldmann', 'Non-contact'
}

export interface IEyeExam {
  hospitalId: Types.ObjectId;
  patientId: Types.ObjectId;
  examinerId: Types.ObjectId;
  examType: ExamType;
  chiefComplaint?: string;
  visualAcuityUncorrected?: {
    rightEye?: string;
    leftEye?: string;
  };
  refraction?: IEyeRefraction;
  tonometry?: ITonometry;
  slitLampFindings?: {
    cornea?: string;
    anteriorChamber?: string;
    lens?: string;
    iris?: string;
  };
  fundusFindings?: {
    opticDisc?: string;
    macula?: string;
    vessels?: string;
    periphery?: string;
  };
  diagnosis?: string[];
  treatmentPlan?: string;
  notes?: string;
}

export interface IEyeExamDocument extends IEyeExam, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IPrescriptionEyeDetail extends IRefractionData {
  baseCurve?: number;
  diameter?: number;
  brand?: string;
}

export interface IOpticalPrescription {
  hospitalId: Types.ObjectId;
  patientId: Types.ObjectId;
  prescribedById: Types.ObjectId;
  examId?: Types.ObjectId;
  prescriptionType: PrescriptionType;
  lensType: LensType;
  rightEye: IPrescriptionEyeDetail;
  leftEye: IPrescriptionEyeDetail;
  pupillaryDistanceMm?: number;
  expirationDate: Date;
  specialInstructions?: string;
  isActive: boolean;
}

export interface IOpticalPrescriptionDocument extends IOpticalPrescription, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEyeExamInput {
  hospitalId: string;
  patientId: string;
  examinerId: string;
  examType: ExamType;
  chiefComplaint?: string;
  visualAcuityUncorrected?: {
    rightEye?: string;
    leftEye?: string;
  };
  refraction?: IEyeRefraction;
  tonometry?: ITonometry;
  slitLampFindings?: {
    cornea?: string;
    anteriorChamber?: string;
    lens?: string;
    iris?: string;
  };
  fundusFindings?: {
    opticDisc?: string;
    macula?: string;
    vessels?: string;
    periphery?: string;
  };
  diagnosis?: string[];
  treatmentPlan?: string;
  notes?: string;
}

export interface CreateOpticalPrescriptionInput {
  hospitalId: string;
  patientId: string;
  prescribedById: string;
  examId?: string;
  prescriptionType: PrescriptionType;
  lensType: LensType;
  rightEye: IPrescriptionEyeDetail;
  leftEye: IPrescriptionEyeDetail;
  pupillaryDistanceMm?: number;
  expirationDate: Date;
  specialInstructions?: string;
}

export interface GetEyeExamsQuery {
  page?: number;
  limit?: number;
  patientId?: string;
  examinerId?: string;
  examType?: ExamType;
}

export interface GetOpticalPrescriptionsQuery {
  page?: number;
  limit?: number;
  patientId?: string;
  prescribedById?: string;
  prescriptionType?: PrescriptionType;
  isActive?: boolean;
}