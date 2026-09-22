import { Types } from 'mongoose';
import {
  BenefitCategory,
  BenefitQueryFilters,
  BenefitStatus,
  CreateBenefitDefinitionInput,
  CreateHealthPlanInput,
  EligibilityCheckInput,
  EligibilityCheckResult,
  HealthPlanQueryFilters,
  HealthPlanStatus,
  HealthPlanStats,
  HealthPlanType,
  BenefitStats,
  IBenefitRule,
  IHealthPlanDocument,
  IBenefitDefinitionDocument,
  IPlanBenefitDocument,
  UpdateBenefitDefinitionInput,
  UpdateHealthPlanInput,
  AttachBenefitInput,
  PaginatedBenefitsResult,
  PaginatedHealthPlansResult,
} from './health-plans.types.js';
import {
  BenefitDefinitionModel,
  HealthPlanModel,
  PlanBenefitModel,
} from './health-plans.model.js';

type ServiceError = Error & {
  statusCode: number;
};

const error = (message: string, statusCode = 400): ServiceError =>
  Object.assign(new Error(message), { statusCode });

const objectId = (value: string, field: string): Types.ObjectId => {
  if (!value || !Types.ObjectId.isValid(value)) {
    throw error(`Invalid ${field}`);
  }

  return new Types.ObjectId(value);
};

const clean = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;

  const result = value.trim();

  return result || undefined;
};

const money = (
  value: unknown,
  field: string
): number | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    throw error(`${field} must be a non-negative number`);
  }

  return Math.round((number + Number.EPSILON) * 100) / 100;
};

const integer = (
  value: unknown,
  field: string,
  max = 3650
): number | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const number = Number(value);

  if (
    !Number.isInteger(number) ||
    number < 0 ||
    number > max
  ) {
    throw error(
      `${field} must be an integer between 0 and ${max}`
    );
  }

  return number;
};

const date = (value: unknown, field: string): Date => {
  const result = new Date(String(value));

  if (Number.isNaN(result.getTime())) {
    throw error(`Invalid ${field}`);
  }

  return result;
};

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const validateRule = (
  input: Partial<IBenefitRule>,
  fallback?: IBenefitRule
): IBenefitRule => {
  const covered =
    input.covered ??
    fallback?.covered ??
    true;

  const coveredServices = Array.isArray(input.coveredServices)
    ? input.coveredServices
        .map((item) => clean(item))
        .filter(
          (item): item is string => Boolean(item)
        )
    : fallback?.coveredServices ?? [];

  const annualLimitAmount = money(
    input.annualLimitAmount ??
      fallback?.annualLimitAmount,
    'annualLimitAmount'
  );

  const annualUtilizationLimit = integer(
    input.annualUtilizationLimit ??
      fallback?.annualUtilizationLimit,
    'annualUtilizationLimit',
    1_000_000
  );

  const perVisitLimitAmount = money(
    input.perVisitLimitAmount ??
      fallback?.perVisitLimitAmount,
    'perVisitLimitAmount'
  );

  const copayPercentage = Number(
    input.copayPercentage ??
      fallback?.copayPercentage ??
      0
  );

  if (
    !Number.isFinite(copayPercentage) ||
    copayPercentage < 0 ||
    copayPercentage > 100
  ) {
    throw error(
      'copayPercentage must be between 0 and 100'
    );
  }

  const copayAmount = money(
    input.copayAmount ??
      fallback?.copayAmount,
    'copayAmount'
  );

  const deductibleAmount = money(
    input.deductibleAmount ??
      fallback?.deductibleAmount,
    'deductibleAmount'
  );

  const waitingPeriodDays =
    integer(
      input.waitingPeriodDays ??
        fallback?.waitingPeriodDays ??
        0,
      'waitingPeriodDays'
    ) ?? 0;

  const requiresPreAuth =
    input.requiresPreAuth ??
    fallback?.requiresPreAuth ??
    false;

  const exclusions = Array.isArray(input.exclusions)
    ? input.exclusions
        .map((item) => clean(item))
        .filter(
          (item): item is string => Boolean(item)
        )
    : fallback?.exclusions ?? [];

  const notes = clean(
    input.notes ?? fallback?.notes
  );

  return {
    covered: Boolean(covered),
    coveredServices: [
      ...new Set(coveredServices),
    ],
    annualLimitAmount,
    annualUtilizationLimit,
    perVisitLimitAmount,
    copayPercentage:
      Math.round(copayPercentage * 100) / 100,
    copayAmount,
    deductibleAmount,
    waitingPeriodDays,
    requiresPreAuth: Boolean(requiresPreAuth),
    exclusions: [...new Set(exclusions)],
    notes,
  };
};

const validatePremium = (
  premium: CreateHealthPlanInput['premium']
): CreateHealthPlanInput['premium'] | undefined => {
  if (!premium) return undefined;

  if (
    !Object.values([
      'MONTHLY',
      'QUARTERLY',
      'ANNUAL',
    ]).includes(premium.frequency)
  ) {
    throw error('Invalid premium frequency');
  }

  const individual = money(
    premium.individual,
    'premium.individual'
  );

  const family = money(
    premium.family,
    'premium.family'
  );

  const corporate = money(
    premium.corporate,
    'premium.corporate'
  );

  const currency = clean(
    premium.currency
  )?.toUpperCase();

  if (!currency) {
    throw error(
      'Premium currency is required'
    );
  }

  return {
    individual,
    family,
    corporate,
    currency,
    frequency: premium.frequency,
  };
};

const transitionAllowed = (
  from: HealthPlanStatus,
  to: HealthPlanStatus
): boolean => {
  const transitions: Record<
    HealthPlanStatus,
    HealthPlanStatus[]
  > = {
    [HealthPlanStatus.DRAFT]: [
      HealthPlanStatus.ACTIVE,
      HealthPlanStatus.INACTIVE,
      HealthPlanStatus.ARCHIVED,
    ],

    [HealthPlanStatus.ACTIVE]: [
      HealthPlanStatus.INACTIVE,
      HealthPlanStatus.ARCHIVED,
    ],

    [HealthPlanStatus.INACTIVE]: [
      HealthPlanStatus.ACTIVE,
      HealthPlanStatus.ARCHIVED,
    ],

    [HealthPlanStatus.ARCHIVED]: [],
  };

  return transitions[from].includes(to);
};

export class HealthPlansService {
  public async createBenefit(
    hmoId: string,
    input: CreateBenefitDefinitionInput
  ): Promise<IBenefitDefinitionDocument> {
    const owner = objectId(hmoId, 'HMO ID');

    if (!input || typeof input !== 'object') {
      throw error('Request body is required');
    }

    const code = clean(input.code)?.toUpperCase();
    const name = clean(input.name);

    if (!code) {
      throw error('Benefit code is required');
    }

    if (!name) {
      throw error('Benefit name is required');
    }

    if (
      !Object.values(BenefitCategory).includes(
        input.category
      )
    ) {
      throw error(
        'Invalid benefit category'
      );
    }

    const rule = validateRule(
      input.defaultRule || {}
    );

    try {
      return await BenefitDefinitionModel.create({
        hmoId: owner,
        code,
        name,
        description: clean(input.description),
        category: input.category,
        status:
          input.status ??
          BenefitStatus.DRAFT,
        defaultRule: rule,
      });
    } catch (err: unknown) {
      if (
        (err as { code?: number }).code ===
        11000
      ) {
        throw error(
          `Benefit with code "${code}" already exists`,
          409
        );
      }

      throw err;
    }
  }

  public async getBenefits(
    hmoId: string,
    filters: BenefitQueryFilters = {}
  ): Promise<PaginatedBenefitsResult> {
    const owner = objectId(hmoId, 'HMO ID');

    const page = Math.max(
      1,
      Math.floor(Number(filters.page) || 1)
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        Math.floor(Number(filters.limit) || 20)
      )
    );

    const query: Record<string, unknown> = {
      hmoId: owner,
    };

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.category) {
      query.category = filters.category;
    }

    const search = clean(filters.search);

    if (search) {
      const regex = new RegExp(
        escapeRegex(search),
        'i'
      );

      query.$or = [
        { code: regex },
        { name: regex },
        { description: regex },
      ];
    }

    const [
      benefits,
      total,
    ] = await Promise.all([
      BenefitDefinitionModel.find(query)
        .sort({
          createdAt: -1,
          _id: -1,
        })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),

      BenefitDefinitionModel.countDocuments(
        query
      ),
    ]);

    return {
      benefits,
      total,
      page,
      limit,
      totalPages: Math.ceil(
        total / limit
      ),
    };
  }

  public async getBenefitById(
    id: string,
    hmoId: string
  ): Promise<IBenefitDefinitionDocument | null> {
    return BenefitDefinitionModel.findOne({
      _id: objectId(id, 'benefit ID'),
      hmoId: objectId(hmoId, 'HMO ID'),
    }).exec();
  }

  public async updateBenefit(
    id: string,
    hmoId: string,
    input: UpdateBenefitDefinitionInput
  ): Promise<IBenefitDefinitionDocument | null> {
    const current =
      await this.getBenefitById(
        id,
        hmoId
      );

    if (!current) return null;

    const update: Record<
      string,
      unknown
    > = {};

    if (input.code !== undefined) {
      const code = clean(
        input.code
      )?.toUpperCase();

      if (!code) {
        throw error(
          'Benefit code cannot be empty'
        );
      }

      update.code = code;
    }

    if (input.name !== undefined) {
      const name = clean(
        input.name
      );

      if (!name) {
        throw error(
          'Benefit name cannot be empty'
        );
      }

      update.name = name;
    }

    if (
      input.description !== undefined
    ) {
      update.description = clean(
        input.description
      );
    }

    if (input.category !== undefined) {
      if (
        !Object.values(
          BenefitCategory
        ).includes(input.category)
      ) {
        throw error(
          'Invalid benefit category'
        );
      }

      update.category =
        input.category;
    }

    if (input.status !== undefined) {
      update.status = input.status;
    }

    if (
      input.defaultRule !== undefined
    ) {
      update.defaultRule =
        validateRule(
          input.defaultRule,
          current.defaultRule
        );
    }

    if (!Object.keys(update).length) {
      throw error(
        'No valid fields supplied for update'
      );
    }

    try {
      return await BenefitDefinitionModel
        .findOneAndUpdate(
          {
            _id: current._id,
            hmoId: objectId(
              hmoId,
              'HMO ID'
            ),
          },
          { $set: update },
          {
            new: true,
            runValidators: true,
          }
        )
        .exec();
    } catch (err: unknown) {
      if (
        (err as { code?: number }).code ===
        11000
      ) {
        throw error(
          `Benefit with code "${String(
            update.code
          )}" already exists`,
          409
        );
      }

      throw err;
    }
  }

  public async createPlan(
    hmoId: string,
    input: CreateHealthPlanInput
  ): Promise<IHealthPlanDocument> {
    const owner = objectId(
      hmoId,
      'HMO ID'
    );

    if (!input || typeof input !== 'object') {
      throw error(
        'Request body is required'
      );
    }

    const code = clean(
      input.code
    )?.toUpperCase();

    const name = clean(input.name);

    if (!code) {
      throw error(
        'Plan code is required'
      );
    }

    if (!name) {
      throw error(
        'Plan name is required'
      );
    }

    if (
      !Object.values(
        HealthPlanType
      ).includes(input.type)
    ) {
      throw error(
        'Invalid plan type'
      );
    }

    const effectiveFrom =
      date(
        input.effectiveFrom,
        'effectiveFrom'
      );

    const effectiveTo =
      input.effectiveTo
        ? date(
            input.effectiveTo,
            'effectiveTo'
          )
        : undefined;

    if (
      effectiveTo &&
      effectiveTo <= effectiveFrom
    ) {
      throw error(
        'effectiveTo must be after effectiveFrom'
      );
    }

    const waiting =
      integer(
        input.defaultWaitingPeriodDays ??
          0,
        'defaultWaitingPeriodDays'
      ) ?? 0;

    const annualUtilizationLimit =
      integer(
        input.annualUtilizationLimit,
        'annualUtilizationLimit',
        1_000_000
      );

    const benefitIds =
      await this.validateBenefitsBelongToHmo(
        input.benefitIds ?? [],
        owner
      );

    const premium =
      validatePremium(
        input.premium
      );

    try {
      return await HealthPlanModel.create({
        hmoId: owner,
        code,
        name,
        description: clean(
          input.description
        ),
        type: input.type,
        status:
          input.status ??
          HealthPlanStatus.DRAFT,
        tier: clean(input.tier),
        currency:
          clean(input.currency)
            ?.toUpperCase() ||
          premium?.currency ||
          'NGN',
        premium,
        defaultWaitingPeriodDays:
          waiting,
        annualUtilizationLimit,
        effectiveFrom,
        effectiveTo,
        benefitIds,
        notes: clean(input.notes),
      });
    } catch (err: unknown) {
      if (
        (err as { code?: number }).code ===
        11000
      ) {
        throw error(
          `Health plan with code "${code}" already exists`,
          409
        );
      }

      throw err;
    }
  }

  private async validateBenefitsBelongToHmo(
    ids: string[],
    hmoId: Types.ObjectId
  ): Promise<Types.ObjectId[]> {
    const uniqueIds: string[] = [
      ...new Set(
        ids.filter(
          (id): id is string =>
            typeof id === 'string' &&
            id.trim().length > 0
        )
      ),
    ];

    const objectIds: Types.ObjectId[] =
      uniqueIds.map(
        (id: string): Types.ObjectId =>
          objectId(id, 'benefit ID')
      );

    if (!objectIds.length) {
      return [];
    }

    const count =
      await BenefitDefinitionModel.countDocuments(
        {
          hmoId,
          _id: {
            $in: objectIds,
          },
        }
      );

    if (
      count !== objectIds.length
    ) {
      throw error(
        'One or more benefits do not belong to this HMO'
      );
    }

    return objectIds;
  }

  public async getPlans(
    hmoId: string,
    filters: HealthPlanQueryFilters = {}
  ): Promise<PaginatedHealthPlansResult> {
    const owner = objectId(
      hmoId,
      'HMO ID'
    );

    const page = Math.max(
      1,
      Math.floor(Number(filters.page) || 1)
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        Math.floor(
          Number(filters.limit) || 20
        )
      )
    );

    const query: Record<
      string,
      unknown
    > = {
      hmoId: owner,
    };

    if (filters.status) {
      query.status =
        filters.status;
    }

    if (filters.type) {
      query.type = filters.type;
    }

    const tier = clean(
      filters.tier
    );

    if (tier) {
      query.tier = tier;
    }

    if (filters.effectiveDate) {
      const effective = date(
        filters.effectiveDate,
        'effectiveDate'
      );

      query.effectiveFrom = {
        $lte: effective,
      };

      query.$or = [
        {
          effectiveTo: {
            $exists: false,
          },
        },
        {
          effectiveTo: null,
        },
        {
          effectiveTo: {
            $gte: effective,
          },
        },
      ];
    }

    const search = clean(
      filters.search
    );

    if (search) {
      const regex = new RegExp(
        escapeRegex(search),
        'i'
      );

      query.$and = [
        {
          $or: [
            { code: regex },
            { name: regex },
            { description: regex },
          ],
        },
      ];
    }

    const [
      plans,
      total,
    ] = await Promise.all([
      HealthPlanModel.find(query)
        .populate('benefitIds')
        .sort({
          createdAt: -1,
          _id: -1,
        })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),

      HealthPlanModel.countDocuments(
        query
      ),
    ]);

    return {
      plans,
      total,
      page,
      limit,
      totalPages: Math.ceil(
        total / limit
      ),
    };
  }

  public async getPlanById(
    id: string,
    hmoId: string
  ): Promise<IHealthPlanDocument | null> {
    return HealthPlanModel.findOne({
      _id: objectId(
        id,
        'plan ID'
      ),
      hmoId: objectId(
        hmoId,
        'HMO ID'
      ),
    })
      .populate('benefitIds')
      .exec();
  }

  public async updatePlan(
    id: string,
    hmoId: string,
    input: UpdateHealthPlanInput
  ): Promise<IHealthPlanDocument | null> {
    const current =
      await HealthPlanModel.findOne({
        _id: objectId(
          id,
          'plan ID'
        ),
        hmoId: objectId(
          hmoId,
          'HMO ID'
        ),
      }).exec();

    if (!current) return null;

    const update: Record<
      string,
      unknown
    > = {};

    if (input.code !== undefined) {
      const code = clean(
        input.code
      )?.toUpperCase();

      if (!code) {
        throw error(
          'Plan code cannot be empty'
        );
      }

      update.code = code;
    }

    if (input.name !== undefined) {
      const name = clean(
        input.name
      );

      if (!name) {
        throw error(
          'Plan name cannot be empty'
        );
      }

      update.name = name;
    }

    if (
      input.description !==
      undefined
    ) {
      update.description =
        clean(input.description);
    }

    if (input.type !== undefined) {
      if (
        !Object.values(
          HealthPlanType
        ).includes(input.type)
      ) {
        throw error(
          'Invalid plan type'
        );
      }

      update.type = input.type;
    }

    if (input.tier !== undefined) {
      update.tier = clean(
        input.tier
      );
    }

    if (
      input.currency !==
      undefined
    ) {
      const currency =
        clean(
          input.currency
        )?.toUpperCase();

      if (!currency) {
        throw error(
          'Currency cannot be empty'
        );
      }

      update.currency =
        currency;
    }

    if (
      input.premium !==
      undefined
    ) {
      update.premium =
        validatePremium(
          input.premium
        );
    }

    if (
      input.defaultWaitingPeriodDays !==
      undefined
    ) {
      update.defaultWaitingPeriodDays =
        integer(
          input.defaultWaitingPeriodDays,
          'defaultWaitingPeriodDays'
        );
    }

    if (
      input.annualUtilizationLimit !==
      undefined
    ) {
      update.annualUtilizationLimit =
        integer(
          input.annualUtilizationLimit,
          'annualUtilizationLimit',
          1_000_000
        );
    }

    if (
      input.effectiveFrom !==
      undefined
    ) {
      update.effectiveFrom =
        date(
          input.effectiveFrom,
          'effectiveFrom'
        );
    }

    if (
      input.effectiveTo !==
      undefined
    ) {
      update.effectiveTo =
        input.effectiveTo === null
          ? null
          : date(
              input.effectiveTo,
              'effectiveTo'
            );
    }

    if (
      input.benefitIds !==
      undefined
    ) {
      update.benefitIds =
        await this.validateBenefitsBelongToHmo(
          input.benefitIds,
          objectId(
            hmoId,
            'HMO ID'
          )
        );
    }

    if (input.notes !== undefined) {
      update.notes = clean(
        input.notes
      );
    }

    if (!Object.keys(update).length) {
      throw error(
        'No valid fields supplied for update'
      );
    }

    const effectiveFrom =
      update.effectiveFrom instanceof Date
        ? update.effectiveFrom
        : current.effectiveFrom;

    const effectiveTo =
      update.effectiveTo === null
        ? undefined
        : update.effectiveTo instanceof Date
          ? update.effectiveTo
          : current.effectiveTo;

    if (
      effectiveTo &&
      effectiveTo <= effectiveFrom
    ) {
      throw error(
        'effectiveTo must be after effectiveFrom'
      );
    }

    try {
      return await HealthPlanModel
        .findOneAndUpdate(
          {
            _id: current._id,
            hmoId: objectId(
              hmoId,
              'HMO ID'
            ),
          },
          { $set: update },
          {
            new: true,
            runValidators: true,
          }
        )
        .populate('benefitIds')
        .exec();
    } catch (err: unknown) {
      if (
        (err as { code?: number }).code ===
        11000
      ) {
        throw error(
          `Health plan with code "${String(
            update.code
          )}" already exists`,
          409
        );
      }

      throw err;
    }
  }

  public async setPlanStatus(
    id: string,
    hmoId: string,
    status: HealthPlanStatus
  ): Promise<IHealthPlanDocument | null> {
    if (
      !Object.values(
        HealthPlanStatus
      ).includes(status)
    ) {
      throw error(
        'Invalid plan status'
      );
    }

    const plan =
      await HealthPlanModel.findOne({
        _id: objectId(
          id,
          'plan ID'
        ),
        hmoId: objectId(
          hmoId,
          'HMO ID'
        ),
      }).exec();

    if (!plan) return null;

    if (plan.status === status) {
      return plan;
    }

    if (
      !transitionAllowed(
        plan.status,
        status
      )
    ) {
      throw error(
        `Invalid plan status transition: ${plan.status} -> ${status}`
      );
    }

    if (
      status ===
        HealthPlanStatus.ACTIVE &&
      !plan.benefitIds.length
    ) {
      throw error(
        'A plan must have at least one benefit before activation'
      );
    }

    plan.status = status;

    return plan.save();
  }

  public async attachBenefit(
    planId: string,
    hmoId: string,
    input: AttachBenefitInput
  ): Promise<IPlanBenefitDocument> {
    const owner = objectId(
      hmoId,
      'HMO ID'
    );

    const plan =
      await HealthPlanModel.findOne({
        _id: objectId(
          planId,
          'plan ID'
        ),
        hmoId: owner,
      }).exec();

    if (!plan) {
      throw error(
        'Health plan not found',
        404
      );
    }

    const benefit =
      await BenefitDefinitionModel.findOne({
        _id: objectId(
          input.benefitId,
          'benefit ID'
        ),
        hmoId: owner,
      }).exec();

    if (!benefit) {
      throw error(
        'Benefit not found for this HMO',
        404
      );
    }

    const rule = validateRule(
      input.rule || {},
      benefit.defaultRule
    );

    try {
      const association =
        await PlanBenefitModel.create({
          hmoId: owner,
          healthPlanId:
            plan._id,
          benefitId:
            benefit._id,
          rule,
        });

      const alreadyAttached =
        plan.benefitIds.some(
          (
            id: Types.ObjectId
          ): boolean =>
            id.equals(
              benefit._id
            )
        );

      if (!alreadyAttached) {
        plan.benefitIds.push(
          benefit._id
        );

        await plan.save();
      }

      return association;
    } catch (err: unknown) {
      if (
        (err as { code?: number }).code ===
        11000
      ) {
        throw error(
          'Benefit is already attached to this plan',
          409
        );
      }

      throw err;
    }
  }

  public async getPlanBenefits(
    planId: string,
    hmoId: string
  ): Promise<IPlanBenefitDocument[]> {
    return PlanBenefitModel.find({
      healthPlanId: objectId(
        planId,
        'plan ID'
      ),
      hmoId: objectId(
        hmoId,
        'HMO ID'
      ),
    })
      .populate('benefitId')
      .sort({
        createdAt: 1,
        _id: 1,
      })
      .exec();
  }

  public async detachBenefit(
    planId: string,
    benefitId: string,
    hmoId: string
  ): Promise<boolean> {
    const owner = objectId(
      hmoId,
      'HMO ID'
    );

    const planObjectId =
      objectId(
        planId,
        'plan ID'
      );

    const benefitObjectId =
      objectId(
        benefitId,
        'benefit ID'
      );

    const result =
      await PlanBenefitModel.deleteOne({
        hmoId: owner,
        healthPlanId:
          planObjectId,
        benefitId:
          benefitObjectId,
      }).exec();

    if (result.deletedCount) {
      await HealthPlanModel.updateOne(
        {
          _id: planObjectId,
          hmoId: owner,
        },
        {
          $pull: {
            benefitIds:
              benefitObjectId,
          },
        }
      ).exec();

      return true;
    }

    return false;
  }

  public async getPlanStats(
    hmoId: string
  ): Promise<HealthPlanStats> {
    const owner = objectId(
      hmoId,
      'HMO ID'
    );

    const [
      total,
      draft,
      active,
      inactive,
      archived,
    ] = await Promise.all([
      HealthPlanModel.countDocuments({
        hmoId: owner,
      }),

      HealthPlanModel.countDocuments({
        hmoId: owner,
        status:
          HealthPlanStatus.DRAFT,
      }),

      HealthPlanModel.countDocuments({
        hmoId: owner,
        status:
          HealthPlanStatus.ACTIVE,
      }),

      HealthPlanModel.countDocuments({
        hmoId: owner,
        status:
          HealthPlanStatus.INACTIVE,
      }),

      HealthPlanModel.countDocuments({
        hmoId: owner,
        status:
          HealthPlanStatus.ARCHIVED,
      }),
    ]);

    return {
      total,
      draft,
      active,
      inactive,
      archived,
    };
  }

  public async getBenefitStats(
    hmoId: string
  ): Promise<BenefitStats> {
    const owner = objectId(
      hmoId,
      'HMO ID'
    );

    const [
      total,
      draft,
      active,
      inactive,
      archived,
    ] = await Promise.all([
      BenefitDefinitionModel.countDocuments({
        hmoId: owner,
      }),

      BenefitDefinitionModel.countDocuments({
        hmoId: owner,
        status:
          BenefitStatus.DRAFT,
      }),

      BenefitDefinitionModel.countDocuments({
        hmoId: owner,
        status:
          BenefitStatus.ACTIVE,
      }),

      BenefitDefinitionModel.countDocuments({
        hmoId: owner,
        status:
          BenefitStatus.INACTIVE,
      }),

      BenefitDefinitionModel.countDocuments({
        hmoId: owner,
        status:
          BenefitStatus.ARCHIVED,
      }),
    ]);

    return {
      total,
      draft,
      active,
      inactive,
      archived,
    };
  }

  public async checkEligibility(
    hmoId: string,
    input: EligibilityCheckInput
  ): Promise<EligibilityCheckResult> {
    const owner = objectId(
      hmoId,
      'HMO ID'
    );

    const plan =
      await HealthPlanModel.findOne({
        _id: objectId(
          input.planId,
          'plan ID'
        ),
        hmoId: owner,
      }).exec();

    if (!plan) {
      throw error(
        'Health plan not found',
        404
      );
    }

    const serviceDate =
      input.serviceDate
        ? date(
            input.serviceDate,
            'serviceDate'
          )
        : new Date();

    if (
      plan.status !==
      HealthPlanStatus.ACTIVE
    ) {
      return this.ineligible(
        plan,
        'Health plan is not active',
        input.requestedAmount
      );
    }

    if (
      serviceDate <
        plan.effectiveFrom ||
      (plan.effectiveTo &&
        serviceDate >
          plan.effectiveTo)
    ) {
      return this.ineligible(
        plan,
        'Health plan is not effective on the service date',
        input.requestedAmount
      );
    }

    const association =
      await this.findPlanBenefit(
        plan._id,
        owner,
        input.benefitId,
        input.benefitCode
      );

    if (!association) {
      return this.ineligible(
        plan,
        'Benefit is not covered by this plan',
        input.requestedAmount
      );
    }

    const benefit =
      await BenefitDefinitionModel.findOne({
        _id: association.benefitId,
        hmoId: owner,
      }).exec();

    if (!benefit) {
      return this.ineligible(
        plan,
        'Benefit definition not found',
        input.requestedAmount,
        association
      );
    }

    const rule = association.rule;

    const requestedAmount =
      money(
        input.requestedAmount ??
          0,
        'requestedAmount'
      ) ?? 0;

    const annualUsedAmount =
      money(
        input.annualUsedAmount ??
          0,
        'annualUsedAmount'
      ) ?? 0;

    const annualUsedVisits =
      integer(
        input.annualUsedVisits ??
          0,
        'annualUsedVisits',
        1_000_000
      ) ?? 0;

    const coverageStart =
      date(
        input.coverageStartDate,
        'coverageStartDate'
      );

    const waitingEnd =
      new Date(
        coverageStart.getTime() +
          rule.waitingPeriodDays *
            86_400_000
      );

    if (
      serviceDate <
      waitingEnd
    ) {
      return this.ineligible(
        plan,
        `Benefit waiting period ends on ${waitingEnd.toISOString()}`,
        requestedAmount,
        association,
        benefit
      );
    }

    if (!rule.covered) {
      return this.ineligible(
        plan,
        'Benefit is excluded from this plan',
        requestedAmount,
        association,
        benefit
      );
    }

    if (
      rule.annualUtilizationLimit !==
        undefined &&
      annualUsedVisits >=
        rule.annualUtilizationLimit
    ) {
      return this.ineligible(
        plan,
        'Annual utilization limit has been reached',
        requestedAmount,
        association,
        benefit
      );
    }

    if (
      rule.annualLimitAmount !==
        undefined &&
      annualUsedAmount >=
        rule.annualLimitAmount
    ) {
      return this.ineligible(
        plan,
        'Annual benefit amount limit has been reached',
        requestedAmount,
        association,
        benefit
      );
    }

    const remainingAnnualAmount =
      rule.annualLimitAmount ===
      undefined
        ? undefined
        : Math.max(
            0,
            rule.annualLimitAmount -
              annualUsedAmount
          );

    const remainingAnnualVisits =
      rule.annualUtilizationLimit ===
      undefined
        ? undefined
        : Math.max(
            0,
            rule.annualUtilizationLimit -
              annualUsedVisits
          );

    const amountAfterAnnual =
      remainingAnnualAmount ===
      undefined
        ? requestedAmount
        : Math.min(
            requestedAmount,
            remainingAnnualAmount
          );

    const payableBeforeCostShare =
      rule.perVisitLimitAmount ===
      undefined
        ? amountAfterAnnual
        : Math.min(
            amountAfterAnnual,
            rule.perVisitLimitAmount
          );

    const copayByPercent =
      payableBeforeCostShare *
      (rule.copayPercentage /
        100);

    const copayAmount =
      Math.min(
        payableBeforeCostShare,
        Math.max(
          copayByPercent,
          rule.copayAmount ?? 0
        )
      );

    const deductibleAmount =
      Math.min(
        Math.max(
          0,
          rule.deductibleAmount ?? 0
        ),
        Math.max(
          0,
          payableBeforeCostShare -
            copayAmount
        )
      );

    const hmoPayable =
      Math.max(
        0,
        payableBeforeCostShare -
          copayAmount -
          deductibleAmount
      );

    return {
      eligible: true,
      planId: String(
        plan._id
      ),
      benefitId: String(
        benefit._id
      ),
      benefitCode:
        benefit.code,
      benefitName:
        benefit.name,
      category:
        benefit.category,
      covered: true,
      requiresPreAuth:
        rule.requiresPreAuth,
      waitingPeriodDays:
        rule.waitingPeriodDays,
      remainingAnnualAmount,
      remainingAnnualVisits,
      requestedAmount,
      estimatedCopayAmount:
        Math.round(
          copayAmount * 100
        ) / 100,
      estimatedDeductibleAmount:
        Math.round(
          deductibleAmount * 100
        ) / 100,
      estimatedHmoPayableAmount:
        Math.round(
          hmoPayable * 100
        ) / 100,
    };
  }

  private async findPlanBenefit(
    planId: Types.ObjectId,
    hmoId: Types.ObjectId,
    benefitId?: string,
    benefitCode?: string
  ): Promise<IPlanBenefitDocument | null> {
    if (benefitId) {
      return PlanBenefitModel.findOne({
        healthPlanId: planId,
        hmoId,
        benefitId: objectId(
          benefitId,
          'benefit ID'
        ),
      }).exec();
    }

    if (!benefitCode) {
      throw error(
        'benefitId or benefitCode is required'
      );
    }

    const benefit =
      await BenefitDefinitionModel.findOne({
        hmoId,
        code: clean(
          benefitCode
        )?.toUpperCase(),
      }).exec();

    if (!benefit) {
      return null;
    }

    return PlanBenefitModel.findOne({
      healthPlanId: planId,
      hmoId,
      benefitId: benefit._id,
    }).exec();
  }

  private ineligible(
    plan: IHealthPlanDocument,
    reason: string,
    amount?: number,
    association?: IPlanBenefitDocument,
    benefit?: IBenefitDefinitionDocument
  ): EligibilityCheckResult {
    return {
      eligible: false,
      planId: String(
        plan._id
      ),
      benefitId: benefit
        ? String(benefit._id)
        : association
          ? String(
              association.benefitId
            )
          : undefined,
      benefitCode:
        benefit?.code,
      benefitName:
        benefit?.name,
      category:
        benefit?.category,
      reason,
      covered: Boolean(
        association?.rule.covered
      ),
      requiresPreAuth:
        Boolean(
          association?.rule
            .requiresPreAuth
        ),
      waitingPeriodDays:
        association?.rule
          .waitingPeriodDays ??
        plan.defaultWaitingPeriodDays,
      requestedAmount:
        Number(amount ?? 0),
      estimatedCopayAmount: 0,
      estimatedDeductibleAmount: 0,
      estimatedHmoPayableAmount: 0,
    };
  }
}

export const healthPlansService =
  new HealthPlansService();