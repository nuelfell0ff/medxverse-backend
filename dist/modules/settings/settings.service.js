import { Types } from 'mongoose';
import { HospitalSettingsModel, ClinicalTemplateModel, SystemIntegrationModel, } from './settings.model.js';
export class SettingsService {
    async upsertSettings(input) {
        const filter = { hospitalId: new Types.ObjectId(input.hospitalId) };
        const update = {
            ...input,
            updatedById: new Types.ObjectId(input.updatedById),
        };
        return HospitalSettingsModel.findOneAndUpdate(filter, { $set: update }, { new: true, upsert: true }).exec();
    }
    async getSettings(hospitalId) {
        return HospitalSettingsModel.findOne({ hospitalId }).exec();
    }
    async createClinicalTemplate(input) {
        return ClinicalTemplateModel.create({
            ...input,
            hospitalId: new Types.ObjectId(input.hospitalId),
            departmentId: input.departmentId ? new Types.ObjectId(input.departmentId) : undefined,
            createdById: new Types.ObjectId(input.createdById),
        });
    }
    async getClinicalTemplates(hospitalId, category) {
        const filter = { hospitalId, isActive: true };
        if (category)
            filter.category = category;
        return ClinicalTemplateModel.find(filter).sort({ title: 1 }).exec();
    }
    async createIntegration(input) {
        return SystemIntegrationModel.create({
            ...input,
            hospitalId: new Types.ObjectId(input.hospitalId),
        });
    }
    async getIntegrations(hospitalId) {
        return SystemIntegrationModel.find({ hospitalId }).exec();
    }
}
export const settingsService = new SettingsService();
