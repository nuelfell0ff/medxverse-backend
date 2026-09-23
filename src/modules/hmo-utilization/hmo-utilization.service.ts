import { Types } from 'mongoose';
import {
  AlertStatus,
  CreateFraudCaseInput,
  CreateFraudRuleInput,
  FraudCaseQueryFilters,
  FraudCaseStatus,
  FraudEntityType,
  FraudQueryFilters,
  RiskSeverity,
  ReviewAlertInput,
  RuleOperator,
  UpdateFraudCaseInput,
  UpdateFraudRuleInput,
  UtilizationEventInput,
  UtilizationEventType,
  UtilizationQueryFilters,
  UtilizationSourceType,
} from './hmo-utilization.types.js';
import {
  FraudAlertModel,
  FraudCaseModel,
  FraudRuleModel,
  UtilizationEventModel,
} from './hmo-utilization.model.js';

const error = (message: string, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode });

const clean = (value?: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const result = value.trim();
  return result || undefined;
};

const objectId = (value: string, field: string): Types.ObjectId => {
  if (!Types.ObjectId.isValid(value)) throw error(`Invalid ${field}`);
  return new Types.ObjectId(value);
};

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const pageArgs = (query: { page?: number | string; limit?: number | string }) => {
  const page = Math.max(1, Math.floor(Number(query.page) || 1));
  const limit = Math.min(100, Math.max(1, Math.floor(Number(query.limit) || 20)));
  return { page, limit };
};

const dateRange = (query: { fromDate?: string; toDate?: string }) => {
  const result: Record<string, Date> = {};
  if (query.fromDate) {
    const date = new Date(query.fromDate);
    if (Number.isNaN(date.getTime())) throw error('Invalid fromDate');
    result.$gte = date;
  }
  if (query.toDate) {
    const date = new Date(query.toDate);
    if (Number.isNaN(date.getTime())) throw error('Invalid toDate');
    result.$lte = date;
  }
  return Object.keys(result).length ? result : undefined;
};

const compare = (value: number, operator: RuleOperator, threshold: number) => {
  switch (operator) {
    case RuleOperator.GT: return value > threshold;
    case RuleOperator.GTE: return value >= threshold;
    case RuleOperator.LT: return value < threshold;
    case RuleOperator.LTE: return value <= threshold;
    case RuleOperator.EQ: return value === threshold;
    case RuleOperator.NEQ: return value !== threshold;
  }
};

export class HMOUtilizationService {
  public async createUtilizationEvent(hmoId: string, input: UtilizationEventInput) {
    const owner = objectId(hmoId, 'HMO ID');
    const memberId = objectId(input.memberId, 'member ID');

    if (!input.serviceDate) throw error('Service date is required');
    const serviceDate = new Date(input.serviceDate);
    if (Number.isNaN(serviceDate.getTime())) throw error('Invalid service date');

    const category = input.category ?? UtilizationEventType.OTHER;
    const sourceType = input.sourceType ?? UtilizationSourceType.MANUAL;

    return UtilizationEventModel.create({
      hmoId: owner,
      memberId,
      providerId: input.providerId ? objectId(input.providerId, 'provider ID') : undefined,
      claimId: input.claimId ? objectId(input.claimId, 'claim ID') : undefined,
      preAuthorizationId: input.preAuthorizationId
        ? objectId(input.preAuthorizationId, 'pre-authorization ID')
        : undefined,
      serviceCode: clean(input.serviceCode),
      serviceName: clean(input.serviceName),
      category,
      sourceType,
      serviceDate,
      quantity: Math.max(0, Number(input.quantity) || 1),
      amount: Math.max(0, Number(input.amount) || 0),
      diagnosisCodes: Array.isArray(input.diagnosisCodes) ? input.diagnosisCodes.filter(Boolean) : [],
      metadata: input.metadata,
    });
  }

  public async getUtilizationEvents(hmoId: string, filters: UtilizationQueryFilters = {}) {
    const owner = objectId(hmoId, 'HMO ID');
    const { page, limit } = pageArgs(filters);
    const query: Record<string, unknown> = { hmoId: owner };

    if (filters.memberId) query.memberId = objectId(filters.memberId, 'member ID');
    if (filters.providerId) query.providerId = objectId(filters.providerId, 'provider ID');
    if (filters.category) query.category = filters.category;
    if (filters.sourceType) query.sourceType = filters.sourceType;

    const range = dateRange(filters);
    if (range) query.serviceDate = range;

    if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
      query.amount = {};
      if (filters.minAmount !== undefined) (query.amount as any).$gte = Number(filters.minAmount);
      if (filters.maxAmount !== undefined) (query.amount as any).$lte = Number(filters.maxAmount);
    }

    const search = clean(filters.search);
    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      query.$or = [{ serviceCode: regex }, { serviceName: regex }];
    }

    const [items, total] = await Promise.all([
      UtilizationEventModel.find(query)
        .sort({ serviceDate: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      UtilizationEventModel.countDocuments(query),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  public async createRule(hmoId: string, input: CreateFraudRuleInput) {
    const owner = objectId(hmoId, 'HMO ID');
    const code = clean(input.code)?.toUpperCase();
    const name = clean(input.name);
    if (!code) throw error('Rule code is required');
    if (!name) throw error('Rule name is required');
    if (!clean(input.category)) throw error('Rule category is required');

    try {
      return await FraudRuleModel.create({
        hmoId: owner,
        code,
        name,
        description: clean(input.description),
        category: input.category.trim(),
        entityType: input.entityType ?? FraudEntityType.MULTIPLE,
        severity: input.severity ?? RiskSeverity.MEDIUM,
        enabled: input.enabled ?? true,
        threshold: Math.max(0, Number(input.threshold) || 0),
        operator: input.operator ?? RuleOperator.GTE,
        windowDays: Math.min(365, Math.max(1, Number(input.windowDays) || 30)),
        action: input.action ?? 'ALERT',
      });
    } catch (err: any) {
      if (err?.code === 11000) throw error(`Fraud rule with code "${code}" already exists`, 409);
      throw err;
    }
  }

  public async getRules(hmoId: string) {
    return FraudRuleModel.find({ hmoId: objectId(hmoId, 'HMO ID') })
      .sort({ enabled: -1, createdAt: -1 })
      .lean();
  }

  public async updateRule(hmoId: string, id: string, input: UpdateFraudRuleInput) {
    const update: Record<string, unknown> = {};
    if (input.name !== undefined) update.name = clean(input.name);
    if (input.description !== undefined) update.description = clean(input.description);
    if (input.category !== undefined) update.category = clean(input.category);
    if (input.entityType !== undefined) update.entityType = input.entityType;
    if (input.severity !== undefined) update.severity = input.severity;
    if (input.enabled !== undefined) update.enabled = input.enabled;
    if (input.threshold !== undefined) update.threshold = Math.max(0, Number(input.threshold) || 0);
    if (input.operator !== undefined) update.operator = input.operator;
    if (input.windowDays !== undefined) update.windowDays = Math.min(365, Math.max(1, Number(input.windowDays) || 30));
    if (input.action !== undefined) update.action = input.action;

    const rule = await FraudRuleModel.findOneAndUpdate(
      { _id: objectId(id, 'rule ID'), hmoId: objectId(hmoId, 'HMO ID') },
      { $set: update },
      { new: true, runValidators: true },
    );
    if (!rule) throw error('Fraud rule not found', 404);
    return rule;
  }

  public async getAlerts(hmoId: string, filters: FraudQueryFilters = {}) {
    const owner = objectId(hmoId, 'HMO ID');
    const { page, limit } = pageArgs(filters);
    const query: Record<string, unknown> = { hmoId: owner };

    if (filters.status) query.status = filters.status;
    if (filters.severity) query.severity = filters.severity;
    if (filters.memberId) query.memberId = objectId(filters.memberId, 'member ID');
    if (filters.providerId) query.providerId = objectId(filters.providerId, 'provider ID');
    if (filters.ruleId) query.ruleId = objectId(filters.ruleId, 'rule ID');

    const [items, total] = await Promise.all([
      FraudAlertModel.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      FraudAlertModel.countDocuments(query),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  public async reviewAlert(hmoId: string, id: string, input: ReviewAlertInput, reviewerId?: string) {
    if (!Object.values(AlertStatus).includes(input.status)) throw error('Invalid alert status');

    const alert = await FraudAlertModel.findOne({
      _id: objectId(id, 'alert ID'),
      hmoId: objectId(hmoId, 'HMO ID'),
    });
    if (!alert) throw error('Fraud alert not found', 404);

    alert.status = input.status;
    alert.reviewNote = clean(input.note);
    alert.reviewedAt = new Date();
    if (reviewerId && Types.ObjectId.isValid(reviewerId)) alert.reviewedBy = new Types.ObjectId(reviewerId);
    await alert.save();

    return alert;
  }

  public async createCase(hmoId: string, input: CreateFraudCaseInput) {
    const owner = objectId(hmoId, 'HMO ID');
    const caseNumber = `FRAUD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    return FraudCaseModel.create({
      hmoId: owner,
      alertId: input.alertId ? objectId(input.alertId, 'alert ID') : undefined,
      caseNumber,
      title: clean(input.title),
      description: clean(input.description),
      status: FraudCaseStatus.OPEN,
      severity: input.severity ?? RiskSeverity.MEDIUM,
      entityType: input.entityType ?? FraudEntityType.MULTIPLE,
      memberId: input.memberId ? objectId(input.memberId, 'member ID') : undefined,
      providerId: input.providerId ? objectId(input.providerId, 'provider ID') : undefined,
      claimIds: Array.isArray(input.claimIds)
        ? input.claimIds.map((id) => objectId(id, 'claim ID'))
        : [],
      estimatedLoss: Math.max(0, Number(input.estimatedLoss) || 0),
      recoveredAmount: 0,
      notes: clean(input.notes),
    });
  }

  public async getCases(hmoId: string, filters: FraudCaseQueryFilters = {}) {
    const owner = objectId(hmoId, 'HMO ID');
    const { page, limit } = pageArgs(filters);
    const query: Record<string, unknown> = { hmoId: owner };

    if (filters.status) query.status = filters.status;
    if (filters.severity) query.severity = filters.severity;
    if (filters.entityType) query.entityType = filters.entityType;
    if (filters.memberId) query.memberId = objectId(filters.memberId, 'member ID');
    if (filters.providerId) query.providerId = objectId(filters.providerId, 'provider ID');

    const search = clean(filters.search);
    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      query.$or = [{ caseNumber: regex }, { title: regex }, { description: regex }];
    }

    const [items, total] = await Promise.all([
      FraudCaseModel.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      FraudCaseModel.countDocuments(query),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  public async updateCase(hmoId: string, id: string, input: UpdateFraudCaseInput) {
    const update: Record<string, unknown> = {};
    if (input.status !== undefined) update.status = input.status;
    if (input.severity !== undefined) update.severity = input.severity;
    if (input.assignedTo !== undefined) update.assignedTo = input.assignedTo ? objectId(input.assignedTo, 'assignee ID') : undefined;
    if (input.finding !== undefined) update.finding = clean(input.finding);
    if (input.recoveredAmount !== undefined) update.recoveredAmount = Math.max(0, Number(input.recoveredAmount) || 0);
    if (input.notes !== undefined) update.notes = clean(input.notes);

    if (input.status && [FraudCaseStatus.CONFIRMED, FraudCaseStatus.DISMISSED, FraudCaseStatus.RECOVERED, FraudCaseStatus.CLOSED].includes(input.status)) {
      update.resolvedAt = new Date();
    }

    const item = await FraudCaseModel.findOneAndUpdate(
      { _id: objectId(id, 'case ID'), hmoId: objectId(hmoId, 'HMO ID') },
      { $set: update },
      { new: true, runValidators: true },
    );
    if (!item) throw error('Fraud case not found', 404);
    return item;
  }

  public async getSummary(hmoId: string) {
    const owner = objectId(hmoId, 'HMO ID');

    const [eventStats, openAlerts, highRiskAlerts, cases, confirmedCases, financials] =
      await Promise.all([
        UtilizationEventModel.aggregate([
          { $match: { hmoId: owner } },
          { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$amount' }, quantity: { $sum: '$quantity' } } },
        ]),
        FraudAlertModel.countDocuments({ hmoId: owner, status: { $in: [AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED, AlertStatus.INVESTIGATING] } }),
        FraudAlertModel.countDocuments({ hmoId: owner, severity: { $in: [RiskSeverity.HIGH, RiskSeverity.CRITICAL] }, status: { $ne: AlertStatus.DISMISSED } }),
        FraudCaseModel.countDocuments({ hmoId: owner, status: { $in: [FraudCaseStatus.OPEN, FraudCaseStatus.INVESTIGATING] } }),
        FraudCaseModel.countDocuments({ hmoId: owner, status: { $in: [FraudCaseStatus.CONFIRMED, FraudCaseStatus.RECOVERED] } }),
        FraudCaseModel.aggregate([
          { $match: { hmoId: owner } },
          { $group: { _id: null, estimatedLoss: { $sum: '$estimatedLoss' }, recoveredAmount: { $sum: '$recoveredAmount' } } },
        ]),
      ]);

    const byCategory = await UtilizationEventModel.aggregate([
      { $match: { hmoId: owner } },
      { $group: { _id: '$category', count: { $sum: 1 }, amount: { $sum: '$amount' } } },
      { $sort: { amount: -1 } },
    ]);

    const byProvider = await UtilizationEventModel.aggregate([
      { $match: { hmoId: owner, providerId: { $exists: true } } },
      { $group: { _id: '$providerId', count: { $sum: 1 }, amount: { $sum: '$amount' } } },
      { $sort: { amount: -1 } },
      { $limit: 10 },
    ]);

    return {
      utilization: {
        eventCount: eventStats[0]?.count ?? 0,
        totalAmount: eventStats[0]?.amount ?? 0,
        totalQuantity: eventStats[0]?.quantity ?? 0,
        byCategory,
        topProviders: byProvider,
      },
      fraud: {
        openAlerts,
        highRiskAlerts,
        openCases: cases,
        confirmedCases,
        estimatedLoss: financials[0]?.estimatedLoss ?? 0,
        recoveredAmount: financials[0]?.recoveredAmount ?? 0,
      },
    };
  }

  public async runRules(hmoId: string) {
    const owner = objectId(hmoId, 'HMO ID');
    const rules = await FraudRuleModel.find({ hmoId: owner, enabled: true }).lean();
    const createdAlerts: unknown[] = [];

    for (const rule of rules) {
      if (![
        'HIGH_FREQUENCY_MEMBER',
        'HIGH_FREQUENCY_PROVIDER',
        'HIGH_VALUE_SERVICE',
      ].includes(rule.category)) continue;

      const start = new Date();
      start.setDate(start.getDate() - rule.windowDays);

      if (rule.category === 'HIGH_VALUE_SERVICE') {
        const rows = await UtilizationEventModel.aggregate([
          { $match: { hmoId: owner, serviceDate: { $gte: start } } },
          { $group: { _id: '$serviceCode', amount: { $sum: '$amount' }, count: { $sum: 1 }, claimIds: { $addToSet: '$claimId' } } },
          { $match: { amount: { $gte: rule.threshold } } },
        ]);

        for (const row of rows) {
          const exists = await FraudAlertModel.exists({
            hmoId: owner,
            ruleId: rule._id,
            'evidence.key': row._id,
            createdAt: { $gte: start },
          });
          if (exists) continue;

          createdAlerts.push(await FraudAlertModel.create({
            hmoId: owner,
            ruleId: rule._id,
            status: AlertStatus.OPEN,
            severity: rule.severity,
            title: `High-value utilization detected${row._id ? `: ${row._id}` : ''}`,
            description: `Utilization amount ${row.amount} exceeded configured threshold ${rule.threshold}.`,
            entityType: FraudEntityType.MULTIPLE,
            claimIds: (row.claimIds || []).filter(Boolean),
            evidence: { key: row._id, amount: row.amount, count: row.count, windowDays: rule.windowDays },
            score: Math.min(100, Math.round((row.amount / Math.max(1, rule.threshold)) * 50)),
          }));
        }
      } else {
        const groupField = rule.category === 'HIGH_FREQUENCY_MEMBER' ? '$memberId' : '$providerId';
        const entityType = rule.category === 'HIGH_FREQUENCY_MEMBER' ? FraudEntityType.MEMBER : FraudEntityType.PROVIDER;
        const rows = await UtilizationEventModel.aggregate([
          { $match: { hmoId: owner, serviceDate: { $gte: start }, [rule.category === 'HIGH_FREQUENCY_MEMBER' ? 'memberId' : 'providerId']: { $exists: true } } },
          { $group: { _id: groupField, count: { $sum: '$quantity' }, amount: { $sum: '$amount' }, claimIds: { $addToSet: '$claimId' } } },
          { $match: { count: { $gte: rule.threshold } } },
        ]);

        for (const row of rows) {
          const exists = await FraudAlertModel.exists({
            hmoId: owner,
            ruleId: rule._id,
            [rule.category === 'HIGH_FREQUENCY_MEMBER' ? 'memberId' : 'providerId']: row._id,
            createdAt: { $gte: start },
          });
          if (exists) continue;

          createdAlerts.push(await FraudAlertModel.create({
            hmoId: owner,
            ruleId: rule._id,
            status: AlertStatus.OPEN,
            severity: rule.severity,
            title: `High utilization detected`,
            description: `${rule.category === 'HIGH_FREQUENCY_MEMBER' ? 'Member' : 'Provider'} exceeded configured utilization threshold.`,
            entityType,
            ...(entityType === FraudEntityType.MEMBER ? { memberId: row._id } : { providerId: row._id }),
            claimIds: (row.claimIds || []).filter(Boolean),
            evidence: { count: row.count, amount: row.amount, windowDays: rule.windowDays },
            score: Math.min(100, Math.round((row.count / Math.max(1, rule.threshold)) * 50)),
          }));
        }
      }
    }

    return { created: createdAlerts.length, alerts: createdAlerts };
  }
}
