import { Types } from 'mongoose';
import { TariffModel } from './tariffs.model.js';
import {
  CreateTariffInput,
  UpdateTariffInput,
  TariffQueryFilters,
  PaginatedTariffsResult,
  TariffQuoteInput,
  TariffQuoteResult,
  TariffStatus,
  ITariffProviderRate,
} from './tariffs.types.js';

const isObjectId = (value: string): boolean => Types.ObjectId.isValid(value);

const toObjectId = (value: string, field: string): Types.ObjectId => {
  if (!isObjectId(value)) throw new Error(`Invalid ${field}`);
  return new Types.ObjectId(value);
};

const money = (value: number, field = 'Amount'): number => {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be a finite number greater than or equal to 0`);
  }
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

const dateValue = (value: string | Date, field: string): Date => {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid ${field}`);
  return date;
};

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeProviderRates = (
  rates: CreateTariffInput['providerRates'] | UpdateTariffInput['providerRates']
): ITariffProviderRate[] => {
  if (!rates) return [];

  const seen = new Set<string>();

  return rates.map((rate) => {
    const providerId = toObjectId(rate.providerId, 'provider ID');
    const key = providerId.toString();

    if (seen.has(key)) {
      throw new Error(`Duplicate provider rate for provider ${key}`);
    }
    seen.add(key);

    return {
      providerId,
      amount: money(Number(rate.amount), 'Provider tariff amount'),
      notes: rate.notes?.trim() || undefined,
    };
  });
};

export class TariffsService {
  public async createTariff(input: CreateTariffInput) {
    if (!input.code?.trim()) throw new Error('Tariff code is required');
    if (!input.name?.trim()) throw new Error('Tariff name is required');
    if (!input.category) throw new Error('Tariff category is required');

    const effectiveFrom = dateValue(input.effectiveFrom, 'effectiveFrom');
    const effectiveTo = input.effectiveTo
      ? dateValue(input.effectiveTo, 'effectiveTo')
      : undefined;

    if (effectiveTo && effectiveTo < effectiveFrom) {
      throw new Error('effectiveTo cannot be earlier than effectiveFrom');
    }

    try {
      return await TariffModel.create({
        hmoId: toObjectId(input.hmoId, 'HMO ID'),
        code: input.code.trim().toUpperCase(),
        name: input.name.trim(),
        description: input.description?.trim() || undefined,
        category: input.category,
        status: TariffStatus.DRAFT,
        baseAmount: money(Number(input.baseAmount), 'Base amount'),
        currency: input.currency?.trim().toUpperCase() || 'NGN',
        effectiveFrom,
        effectiveTo,
        unit: input.unit?.trim() || 'SERVICE',
        providerRates: normalizeProviderRates(input.providerRates),
        requiresPreAuth: Boolean(input.requiresPreAuth),
        notes: input.notes?.trim() || undefined,
      });
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new Error('A tariff with this code already exists for this HMO');
      }
      throw error;
    }
  }

  public async getTariffs(
    hmoId: string,
    filters: TariffQueryFilters
  ): Promise<PaginatedTariffsResult> {
    const hmoObjectId = toObjectId(hmoId, 'HMO ID');
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = { hmoId: hmoObjectId };

    if (filters.status) query.status = filters.status;
    if (filters.category) query.category = filters.category;

    if (filters.providerId) {
      const providerId = toObjectId(filters.providerId, 'provider ID');
      query['providerRates.providerId'] = providerId;
    }

    if (filters.effectiveDate) {
      const date = dateValue(filters.effectiveDate, 'effectiveDate');
      query.effectiveFrom = { $lte: date };
      query.$or = [
        { effectiveTo: { $exists: false } },
        { effectiveTo: null },
        { effectiveTo: { $gte: date } },
      ];
    }

    if (filters.search?.trim()) {
      const regex = new RegExp(escapeRegex(filters.search.trim()), 'i');
      query.$and = [
        ...(query.$and ?? []),
        {
          $or: [
            { code: regex },
            { name: regex },
            { description: regex },
          ],
        },
      ];
    }

    const [tariffs, total] = await Promise.all([
      TariffModel.find(query)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      TariffModel.countDocuments(query),
    ]);

    return {
      tariffs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  public async getTariffById(
    id: string,
    hmoId: string
  ) {
    return TariffModel.findOne({
      _id: toObjectId(id, 'tariff ID'),
      hmoId: toObjectId(hmoId, 'HMO ID'),
    }).exec();
  }

  public async updateTariff(
    id: string,
    hmoId: string,
    input: UpdateTariffInput
  ) {
    const tariff = await TariffModel.findOne({
      _id: toObjectId(id, 'tariff ID'),
      hmoId: toObjectId(hmoId, 'HMO ID'),
    });

    if (!tariff) return null;

    if (input.code !== undefined) {
      if (!input.code.trim()) throw new Error('Tariff code cannot be empty');
      tariff.code = input.code.trim().toUpperCase();
    }

    if (input.name !== undefined) {
      if (!input.name.trim()) throw new Error('Tariff name cannot be empty');
      tariff.name = input.name.trim();
    }

    if (input.description !== undefined) {
      tariff.description = input.description.trim() || undefined;
    }

    if (input.category !== undefined) tariff.category = input.category;

    if (input.baseAmount !== undefined) {
      tariff.baseAmount = money(Number(input.baseAmount), 'Base amount');
    }

    if (input.currency !== undefined) {
      if (!input.currency.trim()) throw new Error('Currency cannot be empty');
      tariff.currency = input.currency.trim().toUpperCase();
    }

    if (input.effectiveFrom !== undefined) {
      tariff.effectiveFrom = dateValue(input.effectiveFrom, 'effectiveFrom');
    }

    if (input.effectiveTo !== undefined) {
      tariff.effectiveTo = input.effectiveTo
        ? dateValue(input.effectiveTo, 'effectiveTo')
        : undefined;
    }

    if (tariff.effectiveTo && tariff.effectiveTo < tariff.effectiveFrom) {
      throw new Error('effectiveTo cannot be earlier than effectiveFrom');
    }

    if (input.unit !== undefined) {
      tariff.unit = input.unit.trim() || 'SERVICE';
    }

    if (input.providerRates !== undefined) {
      tariff.providerRates = normalizeProviderRates(input.providerRates);
    }

    if (input.requiresPreAuth !== undefined) {
      tariff.requiresPreAuth = Boolean(input.requiresPreAuth);
    }

    if (input.notes !== undefined) {
      tariff.notes = input.notes.trim() || undefined;
    }

    try {
      return await tariff.save();
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new Error('A tariff with this code already exists for this HMO');
      }
      throw error;
    }
  }

  public async setStatus(
    id: string,
    hmoId: string,
    status: TariffStatus
  ) {
    if (!Object.values(TariffStatus).includes(status)) {
      throw new Error(`Invalid tariff status: ${status}`);
    }

    return TariffModel.findOneAndUpdate(
      {
        _id: toObjectId(id, 'tariff ID'),
        hmoId: toObjectId(hmoId, 'HMO ID'),
      },
      { $set: { status } },
      { new: true, runValidators: true }
    ).exec();
  }

  public async quote(
    hmoId: string,
    input: TariffQuoteInput
  ): Promise<TariffQuoteResult | null> {
    const tariff = await TariffModel.findOne({
      _id: toObjectId(input.tariffId, 'tariff ID'),
      hmoId: toObjectId(hmoId, 'HMO ID'),
      status: TariffStatus.ACTIVE,
    }).exec();

    if (!tariff) return null;

    const date = input.date ? dateValue(input.date, 'quote date') : new Date();

    if (date < tariff.effectiveFrom) {
      throw new Error('Tariff is not effective on the requested date');
    }

    if (tariff.effectiveTo && date > tariff.effectiveTo) {
      throw new Error('Tariff has expired for the requested date');
    }

    let unitAmount = tariff.baseAmount;

    if (input.providerId) {
      const providerId = toObjectId(input.providerId, 'provider ID');
      const providerRate = tariff.providerRates.find(
        (rate) => rate.providerId.toString() === providerId.toString()
      );

      if (providerRate) unitAmount = providerRate.amount;
    }

    const quantity = Number(input.quantity ?? 1);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }

    return {
      tariffId: tariff._id,
      code: tariff.code,
      name: tariff.name,
      unitAmount,
      quantity,
      totalAmount: money(unitAmount * quantity, 'Total amount'),
      currency: tariff.currency,
      requiresPreAuth: tariff.requiresPreAuth,
      effectiveFrom: tariff.effectiveFrom,
      effectiveTo: tariff.effectiveTo,
    };
  }

  public async getStats(hmoId: string) {
    const hmoObjectId = toObjectId(hmoId, 'HMO ID');

    const [total, draft, active, inactive, archived] = await Promise.all([
      TariffModel.countDocuments({ hmoId: hmoObjectId }),
      TariffModel.countDocuments({ hmoId: hmoObjectId, status: TariffStatus.DRAFT }),
      TariffModel.countDocuments({ hmoId: hmoObjectId, status: TariffStatus.ACTIVE }),
      TariffModel.countDocuments({ hmoId: hmoObjectId, status: TariffStatus.INACTIVE }),
      TariffModel.countDocuments({ hmoId: hmoObjectId, status: TariffStatus.ARCHIVED }),
    ]);

    return { total, draft, active, inactive, archived };
  }
}

export const tariffsService = new TariffsService();
