import { Types } from 'mongoose';

import {
  BillingAccountModel,
  ChargeModel,
  PaymentModel,
  PaymentPlanModel,
  PricingCatalogueModel,
  RefundModel,
} from './billing.model.js';

import {
  BillingAccountStatus,
  BillingListQuery,
  BillingSourceModule,
  ChargeStatus,
  CreateBillingAccountInput,
  CreateChargeInput,
  CreatePaymentInput,
  CreatePaymentPlanInput,
  CreatePricingCatalogueItemInput,
  CreateRefundInput,
  PaymentMethod,
  PaymentPlanFrequency,
  PaymentPlanStatus,
  PaymentStatus,
  ReconcilePaymentInput,
  ReconciliationStatus,
  RefundStatus,
  ResolvePriceInput,
  UpdatePricingCatalogueItemInput,
} from './billing.types.js';

/* =========================================================
   HELPERS
========================================================= */

const oid = (value: string | Types.ObjectId, field: string) => {
  if (value instanceof Types.ObjectId) return value;

  if (!Types.ObjectId.isValid(value)) {
    throw new Error(`Invalid ${field}.`);
  }

  return new Types.ObjectId(value);
};

const money = (value: number) => {
  const n = Number(value);

  if (!Number.isFinite(n) || n < 0) {
    throw new Error('Amount must be a valid non-negative number.');
  }

  return Math.round((n + Number.EPSILON) * 100) / 100;
};

const reference = (prefix: string) =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 7)
    .toUpperCase()}`;

const validDate = (value: Date | string | null | undefined, field: string) => {
  if (!value) return undefined;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${field}.`);
  }

  return date;
};

/* =========================================================
   BILLING ACCOUNT
========================================================= */

export const createBillingAccount = async (
  input: CreateBillingAccountInput,
  userId?: string
) => {
  const hospitalId = oid(String(input.hospitalId), 'hospital ID');
  const patientId = oid(String(input.patientId), 'patient ID');

  const existing = await BillingAccountModel.findOne({
    hospitalId,
    patientId,
  });

  if (existing) return existing;

  return BillingAccountModel.create({
    hospitalId,
    patientId,
    billingId: reference('BILL'),
    accountName: input.accountName?.trim(),
    status: BillingAccountStatus.ACTIVE,
    notes: input.notes?.trim(),
    createdBy: userId ? oid(userId, 'user ID') : undefined,
  });
};

export const getBillingSummary = async (accountId: string) => {
  const id = oid(accountId, 'billing account ID');

  const [charges, payments, refunds] = await Promise.all([
    ChargeModel.aggregate([
      {
        $match: {
          billingAccountId: id,
          status: { $ne: ChargeStatus.VOIDED },
        },
      },
      {
        $group: {
          _id: null,
          gross: { $sum: '$grossAmount' },
          discount: { $sum: '$discountAmount' },
          tax: { $sum: '$taxAmount' },
          net: { $sum: '$netAmount' },
        },
      },
    ]),

    PaymentModel.aggregate([
      {
        $match: {
          billingAccountId: id,
          status: {
            $in: [
              PaymentStatus.CONFIRMED,
              PaymentStatus.PARTIALLY_REFUNDED,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          refunded: { $sum: '$refundedAmount' },
        },
      },
    ]),

    RefundModel.aggregate([
      {
        $match: {
          billingAccountId: id,
          status: RefundStatus.COMPLETED,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]),
  ]);

  const netCharges = money(charges[0]?.net || 0);
  const totalPaid = money(payments[0]?.total || 0);
  const totalRefunded = money(refunds[0]?.total || 0);

  return {
    totalCharges: money(charges[0]?.gross || 0),
    totalDiscounts: money(charges[0]?.discount || 0),
    totalTax: money(charges[0]?.tax || 0),
    netCharges,
    totalPaid,
    totalRefunded,
    outstandingBalance: money(
      Math.max(0, netCharges - totalPaid + totalRefunded)
    ),
    availableCredit: money(
      Math.max(0, totalPaid - totalRefunded - netCharges)
    ),
  };
};

export const getBillingAccount = async (id: string) => {
  const account = await BillingAccountModel.findById(id).lean();

  if (!account) {
    throw new Error('Billing account not found.');
  }

  return {
    ...account,
    summary: await getBillingSummary(String(account._id)),
  };
};

export const getPatientBillingAccount = async (
  hospitalId: string,
  patientId: string
) => {
  let account = await BillingAccountModel.findOne({
    hospitalId: oid(hospitalId, 'hospital ID'),
    patientId: oid(patientId, 'patient ID'),
  }).lean();

  if (!account) {
    const created = await createBillingAccount({
      hospitalId,
      patientId,
    });

    account = created.toObject();
  }

  return {
    ...account,
    summary: await getBillingSummary(String(account._id)),
  };
};

export const getPatientBilling = async (
  hospitalId: string,
  patientId: string
) => {
  const account = await getPatientBillingAccount(hospitalId, patientId);
  const accountId = String(account._id);

  const [charges, payments, refunds, paymentPlans] = await Promise.all([
    ChargeModel.find({ billingAccountId: accountId })
      .sort({ chargeDate: -1 })
      .populate('patientId', 'firstName lastName mrn')
      .populate('chargedBy', 'firstName lastName role')
      .lean(),

    PaymentModel.find({ billingAccountId: accountId })
      .sort({ paidAt: -1 })
      .populate('patientId', 'firstName lastName mrn')
      .populate('receivedBy', 'firstName lastName role')
      .lean(),

    RefundModel.find({ billingAccountId: accountId })
      .sort({ createdAt: -1 })
      .lean(),

    PaymentPlanModel.find({ billingAccountId: accountId })
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  return {
    account,
    summary: await getBillingSummary(accountId),
    charges,
    payments,
    refunds,
    paymentPlans,
  };
};

/* =========================================================
   PRICING CATALOGUE
========================================================= */

export const createPricingCatalogueItem = async (
  input: CreatePricingCatalogueItemInput,
  userId?: string
) => {
  const hospitalId = oid(String(input.hospitalId), 'hospital ID');
  const code = input.code.trim().toUpperCase();

  if (!code) throw new Error('Service code is required.');
  if (!input.name.trim()) throw new Error('Service name is required.');

  const effectiveFrom = validDate(
    input.effectiveFrom,
    'effective from date'
  );

  const effectiveTo = validDate(input.effectiveTo, 'effective to date');

  if (effectiveFrom && effectiveTo && effectiveTo <= effectiveFrom) {
    throw new Error('Effective to date must be after effective from date.');
  }

  const departmentId = input.departmentId
    ? oid(String(input.departmentId), 'department ID')
    : undefined;

  const planName = input.planName?.trim() || input.name.trim();

  const existing = await PricingCatalogueModel.findOne({
    hospitalId,
    code,
    departmentId: departmentId || null,
    planName: { $regex: `^${planName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
  });

  if (existing) {
    throw new Error(
      'A pricing catalogue with this plan name already exists for this service and department.'
    );
  }

  return PricingCatalogueModel.create({
    hospitalId,
    code,
    name: input.name.trim(),
    planName,
    category: input.category,
    departmentId,
    departmentName: input.departmentName?.trim(),
    price: money(input.price),
    currency: input.currency?.trim().toUpperCase() || 'NGN',
    version: 1,
    effectiveFrom,
    effectiveTo,
    isActive: true,
    description: input.description?.trim(),
    history: [],
    createdBy: userId ? oid(userId, 'user ID') : undefined,
  });
};

export const getPricingCatalogue = async (
  hospitalId: string,
  query: BillingListQuery
) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));

  const filter: Record<string, unknown> = {
    hospitalId: oid(hospitalId, 'hospital ID'),
  };

  const andFilters: Record<string, unknown>[] = [];

  if (query.category) {
    filter.category = query.category;
  }

  /*
   * Department filtering:
   * - departmentId only  -> match the department ObjectId.
   * - departmentName only -> match the stored department name.
   * - both supplied -> accept either identifier.
   *
   * This keeps department isolation intact while supporting clients that
   * know either the department ID or its human-readable name.
   */
  const departmentId = query.departmentId
    ? oid(String(query.departmentId), 'department ID')
    : undefined;

  const departmentName = query.departmentName?.trim();

  if (departmentId && departmentName) {
    andFilters.push({
      $or: [
        { departmentId },
        {
          departmentName: {
            $regex: `^${departmentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
            $options: 'i',
          },
        },
      ],
    });
  } else if (departmentId) {
    filter.departmentId = departmentId;
  } else if (departmentName) {
    filter.departmentName = {
      $regex: `^${departmentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
      $options: 'i',
    };
  }

  if (query.code?.trim()) {
    filter.code = query.code.trim().toUpperCase();
  }

  if (query.planName?.trim()) {
    filter.planName = {
      $regex: query.planName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      $options: 'i',
    };
  }

  if (query.activeOnly === true || query.activeOnly === 'true') {
    filter.isActive = true;
  }

  if (query.search?.trim()) {
    const search = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    andFilters.push({
      $or: [
        { code: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { departmentName: { $regex: search, $options: 'i' } },
        { planName: { $regex: search, $options: 'i' } },
      ],
    });
  }

  if (andFilters.length) {
    filter.$and = andFilters;
  }

  const [items, total] = await Promise.all([
    PricingCatalogueModel.find(filter)
      .sort({ isActive: -1, departmentName: 1, planName: 1, name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    PricingCatalogueModel.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Resolves the applicable price at a specific date.
 *
 * Precedence:
 *   1. Department-specific catalogue item
 *   2. Hospital-wide catalogue item
 *
 * Only active/effective records are considered.
 */
export const resolvePrice = async (input: ResolvePriceInput) => {
  const hospitalId = oid(String(input.hospitalId), 'hospital ID');
  const code = input.code.trim().toUpperCase();
  const serviceDate = validDate(input.serviceDate, 'service date') || new Date();

  if (input.catalogueItemId) {
    const selected = await PricingCatalogueModel.findOne({
      _id: oid(String(input.catalogueItemId), 'catalogue item ID'),
      hospitalId,
      isActive: true,
      code,
      ...(input.category ? { category: input.category } : {}),
      $or: [
        { effectiveFrom: { $exists: false } },
        { effectiveFrom: null },
        { effectiveFrom: { $lte: serviceDate } },
      ],
      $and: [{
        $or: [
          { effectiveTo: { $exists: false } },
          { effectiveTo: null },
          { effectiveTo: { $gt: serviceDate } },
        ],
      }],
    }).lean();

    if (!selected) {
      throw new Error('The selected pricing catalogue is not active, does not belong to this hospital/service, or is not effective for the selected date.');
    }

    if (input.departmentId && selected.departmentId && String(selected.departmentId) !== String(oid(String(input.departmentId), 'department ID'))) {
      throw new Error('The selected pricing catalogue does not belong to the requested department.');
    }

    if (input.departmentName?.trim() && selected.departmentName?.toLowerCase() !== input.departmentName.trim().toLowerCase()) {
      throw new Error('The selected pricing catalogue does not belong to the requested department.');
    }

    return {
      catalogueItemId: selected._id,
      code: selected.code,
      name: selected.name,
      planName: selected.planName,
      category: selected.category,
      departmentId: selected.departmentId,
      departmentName: selected.departmentName,
      price: selected.price,
      currency: selected.currency,
      version: selected.version,
      effectiveFrom: selected.effectiveFrom,
      effectiveTo: selected.effectiveTo,
    };
  }

  const departmentId = input.departmentId
    ? oid(String(input.departmentId), 'department ID')
    : undefined;

  const baseFilter: Record<string, unknown> = {
    hospitalId,
    code,
    isActive: true,
    $or: [
      { effectiveFrom: { $exists: false } },
      { effectiveFrom: null },
      { effectiveFrom: { $lte: serviceDate } },
    ],
    $and: [
      {
        $or: [
          { effectiveTo: { $exists: false } },
          { effectiveTo: null },
          { effectiveTo: { $gt: serviceDate } },
        ],
      },
    ],
  };

  if (input.category) {
    baseFilter.category = input.category;
  }

  const departmentCandidates: Record<string, unknown>[] = [];

  if (departmentId) {
    departmentCandidates.push({ departmentId });
  }

  if (input.departmentName?.trim()) {
    departmentCandidates.push({
      departmentName: {
        $regex: `^${input.departmentName.trim()}$`,
        $options: 'i',
      },
    });
  }

  departmentCandidates.push({ departmentId: { $exists: false } });
  departmentCandidates.push({ departmentId: null });

  const candidates = await PricingCatalogueModel.find({
    ...baseFilter,
    $or: departmentCandidates,
  })
    .sort({ departmentId: -1, version: -1, effectiveFrom: -1 })
    .lean();

  if (!candidates.length) {
    throw new Error(
      `No active price found for service "${code}" for the requested date.`
    );
  }

  let item = candidates[0];

  if (departmentId || input.departmentName?.trim()) {
    const departmentSpecificCandidates = candidates.filter((candidate) => {
      const sameId =
        departmentId &&
        candidate.departmentId &&
        String(candidate.departmentId) === String(departmentId);

      const sameName =
        input.departmentName &&
        candidate.departmentName?.toLowerCase() ===
          input.departmentName.trim().toLowerCase();

      return Boolean(sameId || sameName);
    });

    if (departmentSpecificCandidates.length > 1) {
      throw new Error(
        `Multiple active pricing plans exist for "${code}" in this department. Select a pricing catalogue explicitly when creating the clinical order.`
      );
    }

    const departmentSpecific = departmentSpecificCandidates[0];

    if (departmentSpecific) {
      item = departmentSpecific;
    }
  }

  return {
    catalogueItemId: item._id,
    code: item.code,
    name: item.name,
    planName: item.planName,
    category: item.category,
    departmentId: item.departmentId,
    departmentName: item.departmentName,
    price: item.price,
    currency: item.currency,
    version: item.version,
    effectiveFrom: item.effectiveFrom,
    effectiveTo: item.effectiveTo,
  };
};

export const getPricingCatalogueHistory = async (id: string) => {
  const item = await PricingCatalogueModel.findById(id).lean();

  if (!item) {
    throw new Error('Pricing catalogue item not found.');
  }

  return {
    catalogueItemId: item._id,
    code: item.code,
    currentVersion: item.version,
    currentPrice: item.price,
    currentCurrency: item.currency,
    currentEffectiveFrom: item.effectiveFrom,
    currentEffectiveTo: item.effectiveTo,
    history: item.history || [],
  };
};

export const updatePricingCatalogueItem = async (
  id: string,
  input: UpdatePricingCatalogueItemInput,
  userId?: string
) => {
  const item = await PricingCatalogueModel.findById(id);

  if (!item) {
    throw new Error('Pricing catalogue item not found.');
  }

  const priceChanged =
    input.price !== undefined && money(input.price) !== money(item.price);

  const effectiveFromChanged =
    input.effectiveFrom !== undefined &&
    String(validDate(input.effectiveFrom, 'effective from date')) !==
      String(item.effectiveFrom);

  if (priceChanged || effectiveFromChanged) {
    item.history.push({
      version: item.version,
      price: item.price,
      currency: item.currency,
      effectiveFrom: item.effectiveFrom,
      effectiveTo: item.effectiveTo,
      changedAt: new Date(),
      changedBy: userId ? oid(userId, 'user ID') : undefined,
      reason:
        'Previous pricing version archived before catalogue price update.',
    });

    item.version += 1;
  }

  if (input.code !== undefined) {
    item.code = input.code.trim().toUpperCase();
  }

  if (input.planName !== undefined) {
    const nextPlanName = input.planName.trim();
    if (!nextPlanName) throw new Error('Plan name cannot be empty.');
    const duplicate = await PricingCatalogueModel.findOne({
      _id: { $ne: item._id },
      hospitalId: item.hospitalId,
      code: item.code,
      departmentId: item.departmentId || null,
      planName: { $regex: `^${nextPlanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    });
    if (duplicate) throw new Error('A pricing catalogue with this plan name already exists for this service and department.');
    item.planName = nextPlanName;
  }

  if (input.name !== undefined) {
    item.name = input.name.trim();
  }

  if (input.category !== undefined) {
    item.category = input.category;
  }

  if (input.departmentId !== undefined) {
    item.departmentId = input.departmentId
      ? oid(String(input.departmentId), 'department ID')
      : undefined;
  }

  if (input.departmentName !== undefined) {
    item.departmentName = input.departmentName.trim();
  }

  if (input.price !== undefined) {
    item.price = money(input.price);
  }

  if (input.currency !== undefined) {
    item.currency = input.currency.trim().toUpperCase();
  }

  if (input.description !== undefined) {
    item.description = input.description.trim();
  }

  if (input.effectiveFrom !== undefined) {
    item.effectiveFrom = validDate(
      input.effectiveFrom,
      'effective from date'
    );
  }

  if (input.effectiveTo !== undefined) {
    item.effectiveTo = validDate(input.effectiveTo, 'effective to date');
  }

  if (
    item.effectiveFrom &&
    item.effectiveTo &&
    item.effectiveTo <= item.effectiveFrom
  ) {
    throw new Error('Effective to date must be after effective from date.');
  }

  if (input.isActive !== undefined) {
    item.isActive = input.isActive;
  }

  if (userId) {
    item.updatedBy = oid(userId, 'user ID');
  }

  await item.save();

  return item;
};

/* =========================================================
   CHARGES
========================================================= */

export const createCharge = async (input: CreateChargeInput) => {
  const hospitalId = oid(String(input.hospitalId), 'hospital ID');
  const patientId = oid(String(input.patientId), 'patient ID');

  let account = input.billingAccountId
    ? await BillingAccountModel.findById(input.billingAccountId)
    : await BillingAccountModel.findOne({ hospitalId, patientId });

  if (!account) {
    account = await createBillingAccount({
      hospitalId,
      patientId,
    });
  }

  if (account.status === BillingAccountStatus.CLOSED) {
    throw new Error('Billing account is closed.');
  }

  if (account.status === BillingAccountStatus.ON_HOLD) {
    throw new Error('Billing account is currently on hold.');
  }

  const quantity = Number(input.quantity ?? 1);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('Quantity must be greater than zero.');
  }

  /*
   * Prevent duplicate source charges.
   * This makes repeated calls from Radiology/Lab/etc. safe.
   */
  if (
    input.sourceId &&
    input.sourceModule &&
    input.sourceModule !== BillingSourceModule.MANUAL
  ) {
    const existing = await ChargeModel.findOne({
      hospitalId,
      sourceModule: input.sourceModule,
      sourceId: oid(String(input.sourceId), 'source ID'),
      status: { $ne: ChargeStatus.VOIDED },
    });

    if (existing) return existing;
  }

  const serviceDate = validDate(input.chargeDate, 'charge date') || new Date();

  let cataloguePrice: number | undefined;
  let catalogueVersion: number | undefined;
  let catalogueItemId: Types.ObjectId | undefined;
  let currency = 'NGN';

  let resolvedUnitPrice: number;
  let resolvedPlanName: string | undefined;
  let overrideApplied = false;

  /*
   * Manual charges:
   *   unitPrice is required.
   *
   * Module-generated charges:
   *   price is resolved centrally from the catalogue.
   */
  if (input.sourceModule === BillingSourceModule.MANUAL) {
    if (input.overridePrice !== undefined) {
      throw new Error(
        'overridePrice is only used when overriding a catalogue price.'
      );
    }

    if (input.unitPrice === undefined) {
      throw new Error('unitPrice is required for a manual charge.');
    }

    resolvedUnitPrice = money(input.unitPrice);
  } else {
    if (!input.serviceCode?.trim()) {
      throw new Error(
        'serviceCode is required for module-generated billing charges.'
      );
    }

    const resolved = await resolvePrice({
      hospitalId,
      code: input.serviceCode,
      catalogueItemId: input.catalogueItemId,
      departmentId: input.departmentId,
      departmentName: input.departmentName,
      category: input.category,
      serviceDate,
    });

    cataloguePrice = money(resolved.price);
    catalogueVersion = resolved.version;
    resolvedPlanName = resolved.planName;
    catalogueItemId = oid(String(resolved.catalogueItemId), 'catalogue item ID');
    currency = resolved.currency;

    resolvedUnitPrice =
      input.overridePrice !== undefined
        ? money(input.overridePrice)
        : cataloguePrice;

    if (input.overridePrice !== undefined) {
      if (!input.overrideReason?.trim()) {
        throw new Error(
          'An override reason is required when overriding a catalogue price.'
        );
      }

      overrideApplied = resolvedUnitPrice !== cataloguePrice;

      if (!overrideApplied) {
        throw new Error(
          'The override price must differ from the catalogue price.'
        );
      }
    }
  }

  const gross = money(quantity * resolvedUnitPrice);
  const discount = money(input.discountAmount ?? 0);
  const tax = money(input.taxAmount ?? 0);

  if (discount > gross) {
    throw new Error('Discount cannot exceed the gross charge.');
  }

  const net = money(gross - discount + tax);

  return ChargeModel.create({
    hospitalId,
    patientId,
    billingAccountId: account._id,

    catalogueItemId,
    serviceCode: input.serviceCode?.trim().toUpperCase(),

    description: input.description.trim(),
    category: input.category,

    sourceModule: input.sourceModule || BillingSourceModule.MANUAL,
    sourceId: input.sourceId
      ? oid(String(input.sourceId), 'source ID')
      : undefined,

    departmentId: input.departmentId
      ? oid(String(input.departmentId), 'department ID')
      : undefined,
    departmentName: input.departmentName?.trim(),

    quantity,

    cataloguePrice,
    catalogueVersion,
    cataloguePlanName: resolvedPlanName,

    unitPrice: resolvedUnitPrice,

    overrideApplied,
    overrideReason: overrideApplied
      ? input.overrideReason?.trim()
      : undefined,

    currency,

    grossAmount: gross,
    discountAmount: discount,
    taxAmount: tax,
    netAmount: net,
    amountPaid: 0,

    status: ChargeStatus.POSTED,

    notes: input.notes?.trim(),

    chargedBy: input.chargedBy
      ? oid(String(input.chargedBy), 'charged by ID')
      : undefined,

    chargeDate: serviceDate,
  });
};

export const getCharges = async (
  hospitalId: string,
  query: BillingListQuery
) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));

  const filter: Record<string, unknown> = {
    hospitalId: oid(hospitalId, 'hospital ID'),
  };

  if (query.patientId) {
    filter.patientId = oid(query.patientId, 'patient ID');
  }

  if (query.billingAccountId) {
    filter.billingAccountId = oid(
      query.billingAccountId,
      'billing account ID'
    );
  }

  if (query.category) filter.category = query.category;
  if (query.status) filter.status = query.status;
  if (query.sourceModule) filter.sourceModule = query.sourceModule;

  if (query.startDate || query.endDate) {
    filter.chargeDate = {
      ...(query.startDate
        ? { $gte: new Date(`${query.startDate}T00:00:00.000`) }
        : {}),
      ...(query.endDate
        ? { $lte: new Date(`${query.endDate}T23:59:59.999`) }
        : {}),
    };
  }

  if (query.search?.trim()) {
    const search = query.search.trim();

    filter.$or = [
      { description: { $regex: search, $options: 'i' } },
      { serviceCode: { $regex: search, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    ChargeModel.find(filter)
      .populate('patientId', 'firstName lastName mrn')
      .populate('billingAccountId', 'billingId')
      .populate('catalogueItemId', 'code name price version currency')
      .sort({ chargeDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    ChargeModel.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

/* =========================================================
   PAYMENT ALLOCATION
========================================================= */

const allocatePaymentToCharges = async (
  billingAccountId: string,
  amount: number
) => {
  let remaining = money(amount);

  const charges = await ChargeModel.find({
    billingAccountId: oid(billingAccountId, 'billing account ID'),
    status: {
      $in: [ChargeStatus.POSTED, ChargeStatus.PARTIALLY_PAID],
    },
    $expr: { $lt: ['$amountPaid', '$netAmount'] },
  }).sort({
    chargeDate: 1,
    createdAt: 1,
  });

  for (const charge of charges) {
    if (remaining <= 0) break;

    const due = money(charge.netAmount - charge.amountPaid);
    const allocation = money(Math.min(due, remaining));

    charge.amountPaid = money(charge.amountPaid + allocation);

    charge.status =
      charge.amountPaid >= charge.netAmount
        ? ChargeStatus.PAID
        : ChargeStatus.PARTIALLY_PAID;

    await charge.save();

    remaining = money(remaining - allocation);
  }

  return {
    allocated: money(amount - remaining),
    unapplied: remaining,
  };
};

/* =========================================================
   PAYMENTS / RECEIPTS
========================================================= */

export const createPayment = async (input: CreatePaymentInput) => {
  const hospitalId = oid(String(input.hospitalId), 'hospital ID');
  const patientId = oid(String(input.patientId), 'patient ID');

  let account = input.billingAccountId
    ? await BillingAccountModel.findById(input.billingAccountId)
    : await BillingAccountModel.findOne({ hospitalId, patientId });

  if (!account) {
    account = await createBillingAccount({
      hospitalId,
      patientId,
    });
  }

  if (account.status === BillingAccountStatus.CLOSED) {
    throw new Error('Billing account is closed.');
  }

  const amount = money(input.amount);

  if (amount <= 0) {
    throw new Error('Payment amount must be greater than zero.');
  }

  const payment = await PaymentModel.create({
    hospitalId,
    patientId,
    billingAccountId: account._id,

    receiptNumber: reference('RCT'),

    amount,
    method: input.method,
    status: PaymentStatus.CONFIRMED,

    reference: input.reference?.trim(),
    provider: input.provider?.trim(),
    providerTransactionId: input.providerTransactionId?.trim(),
    notes: input.notes?.trim(),

    receivedBy: input.receivedBy
      ? oid(String(input.receivedBy), 'received by ID')
      : undefined,

    paidAt: validDate(input.paidAt, 'payment date') || new Date(),

    reconciliationStatus:
      input.method === PaymentMethod.CASH
        ? ReconciliationStatus.RECONCILED
        : ReconciliationStatus.UNRECONCILED,

    refundedAmount: 0,
  });

  const allocation = await allocatePaymentToCharges(
    String(account._id),
    amount
  );

  return {
    payment,
    allocation,
  };
};

export const getPayments = async (
  hospitalId: string,
  query: BillingListQuery
) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));

  const filter: Record<string, unknown> = {
    hospitalId: oid(hospitalId, 'hospital ID'),
  };

  if (query.patientId) {
    filter.patientId = oid(query.patientId, 'patient ID');
  }

  if (query.billingAccountId) {
    filter.billingAccountId = oid(
      query.billingAccountId,
      'billing account ID'
    );
  }

  if (query.paymentMethod) filter.method = query.paymentMethod;
  if (query.paymentStatus) filter.status = query.paymentStatus;

  if (query.reconciliationStatus) {
    filter.reconciliationStatus = query.reconciliationStatus;
  }

  if (query.startDate || query.endDate) {
    filter.paidAt = {
      ...(query.startDate
        ? { $gte: new Date(`${query.startDate}T00:00:00.000`) }
        : {}),
      ...(query.endDate
        ? { $lte: new Date(`${query.endDate}T23:59:59.999`) }
        : {}),
    };
  }

  const [items, total] = await Promise.all([
    PaymentModel.find(filter)
      .populate('patientId', 'firstName lastName mrn')
      .populate('receivedBy', 'firstName lastName role')
      .sort({ paidAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    PaymentModel.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

export const reconcilePayment = async (
  id: string,
  input: ReconcilePaymentInput
) => {
  const payment = await PaymentModel.findById(id);

  if (!payment) {
    throw new Error('Payment not found.');
  }

  payment.reconciliationStatus = input.status;

  if (input.status === ReconciliationStatus.RECONCILED) {
    payment.reconciledAt = new Date();
    payment.reconciledBy = input.reconciledBy
      ? oid(String(input.reconciledBy), 'reconciled by ID')
      : undefined;
  } else {
    payment.reconciledAt = undefined;
    payment.reconciledBy = undefined;
  }

  payment.reconciliationReference =
    input.reconciliationReference?.trim();

  payment.reconciliationNotes = input.notes?.trim();

  return payment.save();
};

/* =========================================================
   REFUNDS
========================================================= */

export const getRefunds = async (
  hospitalId: string,
  query: BillingListQuery
) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));

  const filter: Record<string, unknown> = {
    hospitalId: oid(hospitalId, 'hospital ID'),
  };

  if (query.patientId) {
    filter.patientId = oid(query.patientId, 'patient ID');
  }

  if (query.billingAccountId) {
    filter.billingAccountId = oid(
      query.billingAccountId,
      'billing account ID'
    );
  }

  const status = (query as BillingListQuery & Record<string, unknown>).status;
  if (typeof status === 'string' && status.trim()) {
    filter.status = status.trim();
  }

  if (query.startDate || query.endDate) {
    filter.createdAt = {
      ...(query.startDate
        ? { $gte: new Date(`${query.startDate}T00:00:00.000`) }
        : {}),
      ...(query.endDate
        ? { $lte: new Date(`${query.endDate}T23:59:59.999`) }
        : {}),
    };
  }

  if (query.search?.trim()) {
    const search = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    filter.$or = [
      { reason: { $regex: search, $options: 'i' } },
      { rejectedReason: { $regex: search, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    RefundModel.find(filter)
      .populate('patientId', 'firstName lastName mrn')
      .populate('billingAccountId', 'billingId')
      .populate('paymentId', 'receiptNumber amount status')
      .populate('requestedBy', 'firstName lastName role')
      .populate('approvedBy', 'firstName lastName role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    RefundModel.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

export const createRefund = async (input: CreateRefundInput) => {
  const payment = await PaymentModel.findById(input.paymentId);

  if (!payment) {
    throw new Error('Payment not found.');
  }

  const amount = money(input.amount);
  const refundable = money(payment.amount - payment.refundedAmount);

  if (amount <= 0 || amount > refundable) {
    throw new Error(
      'Refund amount exceeds the refundable payment balance.'
    );
  }

  if (payment.patientId.toString() !== String(input.patientId)) {
    throw new Error('Payment does not belong to this patient.');
  }

  return RefundModel.create({
    hospitalId: oid(String(input.hospitalId), 'hospital ID'),
    patientId: oid(String(input.patientId), 'patient ID'),
    billingAccountId: oid(
      String(input.billingAccountId),
      'billing account ID'
    ),
    paymentId: payment._id,

    amount,
    reason: input.reason.trim(),

    status: RefundStatus.PENDING,

    requestedBy: input.requestedBy
      ? oid(String(input.requestedBy), 'requested by ID')
      : undefined,
  });
};

export const decideRefund = async (
  id: string,
  approved: boolean,
  userId?: string,
  rejectionReason?: string
) => {
  const refund = await RefundModel.findById(id);

  if (!refund) {
    throw new Error('Refund not found.');
  }

  if (refund.status !== RefundStatus.PENDING) {
    throw new Error('Only pending refunds can be decided.');
  }

  if (!approved) {
    refund.status = RefundStatus.REJECTED;
    refund.rejectedReason =
      rejectionReason?.trim() || 'Refund rejected.';

    return refund.save();
  }

  refund.status = RefundStatus.APPROVED;
  refund.approvedBy = userId
    ? oid(userId, 'approved by ID')
    : undefined;
  refund.approvedAt = new Date();

  return refund.save();
};

export const completeRefund = async (id: string) => {
  const refund = await RefundModel.findById(id);

  if (!refund) {
    throw new Error('Refund not found.');
  }

  if (refund.status !== RefundStatus.APPROVED) {
    throw new Error('Only approved refunds can be completed.');
  }

  const payment = await PaymentModel.findById(refund.paymentId);

  if (!payment) {
    throw new Error('Original payment not found.');
  }

  const remainingRefundable = money(
    payment.amount - payment.refundedAmount
  );

  if (refund.amount > remainingRefundable) {
    throw new Error(
      'Refund exceeds the remaining refundable payment amount.'
    );
  }

  payment.refundedAmount = money(
    payment.refundedAmount + refund.amount
  );

  payment.status =
    payment.refundedAmount >= payment.amount
      ? PaymentStatus.REFUNDED
      : PaymentStatus.PARTIALLY_REFUNDED;

  await payment.save();

  refund.status = RefundStatus.COMPLETED;
  refund.completedAt = new Date();

  return refund.save();
};

/* =========================================================
   PAYMENT PLANS
========================================================= */

export const getPaymentPlans = async (
  hospitalId: string,
  query: BillingListQuery
) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));

  const filter: Record<string, unknown> = {
    hospitalId: oid(hospitalId, 'hospital ID'),
  };

  if (query.patientId) {
    filter.patientId = oid(query.patientId, 'patient ID');
  }

  if (query.billingAccountId) {
    filter.billingAccountId = oid(
      query.billingAccountId,
      'billing account ID'
    );
  }

  const status = (query as BillingListQuery & Record<string, unknown>).status;
  if (typeof status === 'string' && status.trim()) {
    filter.status = status.trim();
  }

  if (query.startDate || query.endDate) {
    filter.startDate = {
      ...(query.startDate
        ? { $gte: new Date(`${query.startDate}T00:00:00.000`) }
        : {}),
      ...(query.endDate
        ? { $lte: new Date(`${query.endDate}T23:59:59.999`) }
        : {}),
    };
  }

  if (query.search?.trim()) {
    const search = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    filter.notes = { $regex: search, $options: 'i' };
  }

  const [items, total] = await Promise.all([
    PaymentPlanModel.find(filter)
      .populate('patientId', 'firstName lastName mrn')
      .populate('billingAccountId', 'billingId')
      .populate('createdBy', 'firstName lastName role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    PaymentPlanModel.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

export const createPaymentPlan = async (
  input: CreatePaymentPlanInput
) => {
  const total = money(input.totalAmount);
  const installment = money(input.installmentAmount);

  if (installment <= 0 || installment > total) {
    throw new Error('Invalid installment amount.');
  }

  const start = validDate(input.startDate, 'start date')!;

  const installments: {
    dueDate: Date;
    amount: number;
    paidAmount: number;
    status: 'PENDING';
  }[] = [];

  let remaining = total;
  let current = new Date(start);

  while (remaining > 0) {
    const amount = money(Math.min(installment, remaining));

    installments.push({
      dueDate: new Date(current),
      amount,
      paidAmount: 0,
      status: 'PENDING',
    });

    remaining = money(remaining - amount);

    if (remaining <= 0) break;

    if (input.frequency === PaymentPlanFrequency.WEEKLY) {
      current.setDate(current.getDate() + 7);
    } else if (input.frequency === PaymentPlanFrequency.BIWEEKLY) {
      current.setDate(current.getDate() + 14);
    } else if (input.frequency === PaymentPlanFrequency.MONTHLY) {
      current.setMonth(current.getMonth() + 1);
    } else {
      throw new Error(
        'CUSTOM payment plans require a custom scheduling implementation.'
      );
    }
  }

  return PaymentPlanModel.create({
    hospitalId: oid(String(input.hospitalId), 'hospital ID'),
    patientId: oid(String(input.patientId), 'patient ID'),
    billingAccountId: oid(
      String(input.billingAccountId),
      'billing account ID'
    ),

    totalAmount: total,
    installmentAmount: installment,
    frequency: input.frequency,

    startDate: start,
    endDate:
      validDate(input.endDate, 'end date') ||
      installments.at(-1)?.dueDate,

    status: PaymentPlanStatus.ACTIVE,

    installments,

    notes: input.notes?.trim(),

    createdBy: input.createdBy
      ? oid(String(input.createdBy), 'created by ID')
      : undefined,
  });
};