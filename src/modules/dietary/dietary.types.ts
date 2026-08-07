import { Document, Types } from 'mongoose';

export enum DietType {
  REGULAR = 'REGULAR',
  DIABETIC = 'DIABETIC',
  LOW_SODIUM = 'LOW_SODIUM',
  RENAL = 'RENAL',
  CARDIAC = 'CARDIAC',
  LIQUID_FULL = 'LIQUID_FULL',
  LIQUID_CLEAR = 'LIQUID_CLEAR',
  SOFT = 'SOFT',
  PUREED = 'PUREED',
  NPO = 'NPO', // Nil Per Os / Nothing by mouth
  HIGH_PROTEIN = 'HIGH_PROTEIN',
  KETO = 'KETO',
  VEGETARIAN = 'VEGETARIAN',
  VEGAN = 'VEGAN',
}

export enum MealType {
  BREAKFAST = 'BREAKFAST',
  MORNING_SNACK = 'MORNING_SNACK',
  LUNCH = 'LUNCH',
  AFTERNOON_SNACK = 'AFTERNOON_SNACK',
  DINNER = 'DINNER',
  NIGHT_SNACK = 'NIGHT_SNACK',
}

export enum MealDeliveryStatus {
  PREPARED = 'PREPARED',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  REFUSED = 'REFUSED',
  CANCELLED = 'CANCELLED',
}

export interface IDietaryOrder {
  hospitalId: Types.ObjectId;
  patientId: Types.ObjectId;
  orderedById: Types.ObjectId;
  dietType: DietType;
  allergies?: string[];
  restrictions?: string[];
  specialInstructions?: string;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
}

export interface IDietaryOrderDocument extends IDietaryOrder, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IMealDelivery {
  hospitalId: Types.ObjectId;
  dietaryOrderId: Types.ObjectId;
  patientId: Types.ObjectId;
  mealType: MealType;
  scheduledDate: Date;
  status: MealDeliveryStatus;
  deliveredById?: Types.ObjectId;
  deliveredAt?: Date;
  deliveryNotes?: string;
}

export interface IMealDeliveryDocument extends IMealDelivery, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDietaryOrderInput {
  hospitalId: string;
  patientId: string;
  orderedById: string;
  dietType: DietType;
  allergies?: string[];
  restrictions?: string[];
  specialInstructions?: string;
  startDate: Date;
  endDate?: Date;
}

export interface UpdateDietaryOrderInput {
  dietType?: DietType;
  allergies?: string[];
  restrictions?: string[];
  specialInstructions?: string;
  endDate?: Date;
  isActive?: boolean;
}

export interface CreateMealDeliveryInput {
  hospitalId: string;
  dietaryOrderId: string;
  patientId: string;
  mealType: MealType;
  scheduledDate: Date;
  deliveryNotes?: string;
}

export interface UpdateMealDeliveryStatusInput {
  status: MealDeliveryStatus;
  deliveredById?: string;
  deliveryNotes?: string;
}

export interface GetDietaryOrdersQuery {
  page?: number;
  limit?: number;
  patientId?: string;
  dietType?: DietType;
  isActive?: boolean;
}

export interface GetMealDeliveriesQuery {
  page?: number;
  limit?: number;
  patientId?: string;
  dietaryOrderId?: string;
  mealType?: MealType;
  status?: MealDeliveryStatus;
  scheduledDate?: string;
}