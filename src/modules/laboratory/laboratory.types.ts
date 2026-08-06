import { Document, Types } from 'mongoose';

export type LabTestCategory =
  | 'HAEMATOLOGY'
  | 'BIOCHEMISTRY'
  | 'MICROBIOLOGY'
  | 'PARASITOLOGY'
  | 'SEROLOGY'
  | 'PATHOLOGY'
  | 'OTHER';

export type LabTestStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type LabOrderPriority = 'ROUTINE' | 'URGENT' | 'EMERGENCY';
export type PaymentStatus = 'PENDING' | 'PAID' | 'COVERED_BY_HMO';
export type ParameterResultFlag = 'NORMAL' | 'ABNORMAL' | 'CRITICAL';

export interface ILabTestCatalog {
  name: string;
  code: string;
  category: LabTestCategory;
  price: number;
  sampleType: string;
  turnaroundTimeHours?: number;
  referenceRange?: string;
  unit?: string;
  organizationId: Types.ObjectId;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ILabTestCatalogDocument extends ILabTestCatalog, Document {
  _id: Types.ObjectId;
}

export interface CreateLabTestCatalogDto {
  name: string;
  code?: string;
  category: LabTestCategory;
  price: number;
  sampleType: string;
  turnaroundTimeHours?: number;
  referenceRange?: string;
  unit?: string;
}

export interface UpdateLabTestCatalogDto {
  name?: string;
  category?: LabTestCategory;
  price?: number;
  sampleType?: string;
  turnaroundTimeHours?: number;
  referenceRange?: string;
  unit?: string;
  isActive?: boolean;
}

export interface ILabResultParameter {
  parameterName: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  flag?: ParameterResultFlag;
}

export interface ILabOrderItem {
  testCatalogId: Types.ObjectId;
  testName: string;
  category: LabTestCategory;
  price: number;
  status: LabTestStatus;
  sampleCollectedAt?: Date;
  completedAt?: Date;
  parameters?: ILabResultParameter[];
  overallResult?: string;
  remarks?: string;
}

export interface ILabOrder {
  orderNumber: string;
  patientId: Types.ObjectId;
  opdVisitId?: Types.ObjectId;
  orderedBy: Types.ObjectId;
  labTechnicianId?: Types.ObjectId;
  organizationId: Types.ObjectId;
  items: ILabOrderItem[];
  totalAmount: number;
  priority: LabOrderPriority;
  paymentStatus: PaymentStatus;
  clinicalNotes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ILabOrderDocument extends ILabOrder, Document {
  _id: Types.ObjectId;
}

export interface CreateLabOrderDto {
  patientId: string;
  opdVisitId?: string;
  testCatalogIds: string[];
  priority?: LabOrderPriority;
  paymentStatus?: PaymentStatus;
  clinicalNotes?: string;
}

export interface UpdateLabResultDto {
  parameters?: ILabResultParameter[];
  overallResult?: string;
  remarks?: string;
  status?: LabTestStatus;
}

export interface LabOrderQueryFilters {
  patientId?: string;
  status?: LabTestStatus;
  priority?: LabOrderPriority;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}