import { Types } from 'mongoose';
import { BenefitPackageModel } from './benefits.model.js';
import { BenefitCategory, } from './benefits.types.js';
function requireObjectId(value, field) {
    if (!value || !Types.ObjectId.isValid(value)) {
        const error = new Error(`Invalid ${field}`);
        error.statusCode = 400;
        throw error;
    }
    return new Types.ObjectId(value);
}
function cleanString(value) {
    if (typeof value !== 'string')
        return undefined;
    const trimmed = value.trim();
    return trimmed || undefined;
}
function normaliseRules(rules) {
    if (!Array.isArray(rules))
        return [];
    const seen = new Set();
    return rules.map((rule) => {
        if (!rule || !Object.values(BenefitCategory).includes(rule.category)) {
            throw Object.assign(new Error('Each benefit rule must have a valid category'), {
                statusCode: 400,
            });
        }
        if (seen.has(rule.category)) {
            throw Object.assign(new Error(`Duplicate benefit rule category: ${rule.category}`), { statusCode: 400 });
        }
        seen.add(rule.category);
        if (rule.copayPercentage != null &&
            (rule.copayPercentage < 0 || rule.copayPercentage > 100)) {
            throw Object.assign(new Error(`Invalid copay percentage for ${rule.category}`), {
                statusCode: 400,
            });
        }
        for (const field of ['annualLimit', 'perVisitLimit', 'copayAmount']) {
            const value = rule[field];
            if (value != null && (!Number.isFinite(value) || value < 0)) {
                throw Object.assign(new Error(`${field} must be a non-negative number for ${rule.category}`), { statusCode: 400 });
            }
        }
        return {
            ...rule,
            notes: cleanString(rule.notes),
        };
    });
}
export class BenefitsService {
    async createPackage(hmoId, input) {
        const ownerId = requireObjectId(hmoId, 'HMO ID');
        if (!input || typeof input !== 'object') {
            throw Object.assign(new Error('Request body is required'), { statusCode: 400 });
        }
        const code = cleanString(input.code)?.toUpperCase();
        const name = cleanString(input.name);
        if (!code)
            throw Object.assign(new Error('Benefit package code is required'), { statusCode: 400 });
        if (!name)
            throw Object.assign(new Error('Benefit package name is required'), { statusCode: 400 });
        const annualMaxBenefit = input.annualMaxBenefit;
        if (annualMaxBenefit != null && (!Number.isFinite(annualMaxBenefit) || annualMaxBenefit < 0)) {
            throw Object.assign(new Error('annualMaxBenefit must be a non-negative number'), { statusCode: 400 });
        }
        try {
            return await BenefitPackageModel.create({
                hmoId: ownerId,
                code,
                name,
                description: cleanString(input.description),
                tier: cleanString(input.tier),
                annualMaxBenefit,
                rules: normaliseRules(input.rules),
            });
        }
        catch (error) {
            if (error.code === 11000) {
                throw Object.assign(new Error(`A benefit package with code "${code}" already exists`), { statusCode: 409 });
            }
            throw error;
        }
    }
    async getPackages(hmoId, filters = {}) {
        const ownerId = requireObjectId(hmoId, 'HMO ID');
        const page = Number.isFinite(filters.page) ? Math.max(1, Math.floor(filters.page)) : 1;
        const limit = Number.isFinite(filters.limit)
            ? Math.min(100, Math.max(1, Math.floor(filters.limit)))
            : 20;
        const skip = (page - 1) * limit;
        const query = { hmoId: ownerId };
        if (filters.status)
            query.status = filters.status;
        const tier = cleanString(filters.tier);
        if (tier)
            query.tier = tier;
        const search = cleanString(filters.search);
        if (search) {
            const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const searchRegex = new RegExp(escaped, 'i');
            query.$or = [{ name: searchRegex }, { code: searchRegex }];
        }
        const [packages, total] = await Promise.all([
            BenefitPackageModel.find(query)
                .sort({ createdAt: -1, _id: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            BenefitPackageModel.countDocuments(query),
        ]);
        return {
            packages,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getPackageById(id, hmoId) {
        return BenefitPackageModel.findOne({
            _id: requireObjectId(id, 'benefit package ID'),
            hmoId: requireObjectId(hmoId, 'HMO ID'),
        }).exec();
    }
    async updatePackage(id, hmoId, input) {
        if (!input || typeof input !== 'object') {
            throw Object.assign(new Error('Request body is required'), { statusCode: 400 });
        }
        const update = {};
        if (input.code !== undefined) {
            const code = cleanString(input.code);
            if (!code)
                throw Object.assign(new Error('Benefit package code cannot be empty'), { statusCode: 400 });
            update.code = code.toUpperCase();
        }
        if (input.name !== undefined) {
            const name = cleanString(input.name);
            if (!name)
                throw Object.assign(new Error('Benefit package name cannot be empty'), { statusCode: 400 });
            update.name = name;
        }
        if (input.description !== undefined)
            update.description = cleanString(input.description);
        if (input.tier !== undefined)
            update.tier = cleanString(input.tier);
        if (input.annualMaxBenefit !== undefined) {
            if (!Number.isFinite(input.annualMaxBenefit) || input.annualMaxBenefit < 0) {
                throw Object.assign(new Error('annualMaxBenefit must be a non-negative number'), { statusCode: 400 });
            }
            update.annualMaxBenefit = input.annualMaxBenefit;
        }
        if (input.rules !== undefined)
            update.rules = normaliseRules(input.rules);
        if (input.status !== undefined)
            update.status = input.status;
        if (Object.keys(update).length === 0) {
            throw Object.assign(new Error('No valid fields supplied for update'), { statusCode: 400 });
        }
        try {
            return await BenefitPackageModel.findOneAndUpdate({
                _id: requireObjectId(id, 'benefit package ID'),
                hmoId: requireObjectId(hmoId, 'HMO ID'),
            }, { $set: update }, { new: true, runValidators: true }).exec();
        }
        catch (error) {
            if (error.code === 11000) {
                throw Object.assign(new Error(`A benefit package with code "${String(update.code)}" already exists`), { statusCode: 409 });
            }
            throw error;
        }
    }
}
export const benefitsService = new BenefitsService();
