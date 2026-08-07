import { Types } from 'mongoose';
import {
  HospitalSettingsModel,
  ClinicalTemplateModel,
  SystemIntegrationModel,
} from './settings.model.js';
import {
  UpsertHospitalSettingsInput,
  CreateClinicalTemplateInput,
  CreateIntegrationInput,
  IHospitalSettingsDocument,
  IClinicalTemplateDocument,
  ISystemIntegrationDocument,
} from './settings.types.js';

export class SettingsService {
  public async upsertSettings(
    input: UpsertHospitalSettingsInput
  ): Promise<IHospitalSettingsDocument> {
    const filter = { hospitalId: new Types.ObjectId(input.hospitalId) };
    const update = {
      ...input,
      updatedById: new Types.ObjectId(input.updatedById),
    };

    return HospitalSettingsModel.findOneAndUpdate(filter, { $set: update }, { new: true, upsert: true }).exec();
  }

  public async getSettings(hospitalId: string): Promise<IHospitalSettingsDocument | null> {
    return HospitalSettingsModel.findOne({ hospitalId }).exec();
  }

  public async createClinicalTemplate(
    input: CreateClinicalTemplateInput
  ): Promise<IClinicalTemplateDocument> {
    return ClinicalTemplateModel.create({
      ...input,
      hospitalId: new Types.ObjectId(input.hospitalId),
      departmentId: input.departmentId ? new Types.ObjectId(input.departmentId) : undefined,
      createdById: new Types.ObjectId(input.createdById),
    });
  }

  public async getClinicalTemplates(
    hospitalId: string,
    category?: string
  ): Promise<IClinicalTemplateDocument[]> {
    const filter: Record<string, unknown> = { hospitalId, isActive: true };
    if (category) filter.category = category;

    return ClinicalTemplateModel.find(filter).sort({ title: 1 }).exec();
  }

  public async createIntegration(
    input: CreateIntegrationInput
  ): Promise<ISystemIntegrationDocument> {
    return SystemIntegrationModel.create({
      ...input,
      hospitalId: new Types.ObjectId(input.hospitalId),
    });
  }

  public async getIntegrations(hospitalId: string): Promise<ISystemIntegrationDocument[]> {
    return SystemIntegrationModel.find({ hospitalId }).exec();
  }
}

export const settingsService = new SettingsService();