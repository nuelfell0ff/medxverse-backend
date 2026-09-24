import mongoose, { Types } from 'mongoose';

import {
  MemberPortalProfileModel,
  ProviderPortalProfileModel,
  PortalNotificationModel,
} from './hmo-portals.model.js';

import type {
  CreateProviderAuthorizationInput,
  CreateProviderClaimInput,
  MemberPortalProfileInput,
  ProviderMemberQueryFilters,
  ProviderPortalProfileInput,
  Paginated,
} from './hmo-portals.types.js';

const oid = (value: string, label: string): Types.ObjectId => {
  if (!Types.ObjectId.isValid(value)) {
    throw new Error(`Invalid ${label}`);
  }

  return new Types.ObjectId(value);
};

const pageArgs = (
  page?: number | string,
  limit?: number | string,
) => {
  const p = Math.max(1, Math.floor(Number(page) || 1));
  const l = Math.min(100, Math.max(1, Math.floor(Number(limit) || 20)));

  return {
    page: p,
    limit: l,
    skip: (p - 1) * l,
  };
};

const collectionCandidates: Record<string, string[]> = {
  members: [
    'enrollees',
    'hmoenrollees',
    'hmo_enrollees',
    'members',
  ],

  providers: [
    'providers',
    'hmoproviders',
    'hmo_providers',
  ],

  plans: [
    'healthplans',
    'health_plans',
    'healthplansdefinitions',
    'health_plan_definitions',
  ],

  benefits: [
    'benefitdefinitions',
    'benefit_definitions',
    'benefits',
  ],

  claims: [
    'claims',
    'hmoclaims',
    'hmo_claims',
  ],

  preAuths: [
    'preauthorizations',
    'pre_authorizations',
    'hmo_preauthorizations',
    'hmo_pre_authorizations',
  ],

  invoices: [
    'hmoinvoices',
    'hmo_invoices',
    'invoices',
  ],

  payments: [
    'hmopayments',
    'hmo_payments',
    'payments',
  ],

  settlements: [
    'hmosettlements',
    'hmo_settlements',
    'settlements',
  ],

  utilization: [
    'utilizationevents',
    'utilization_events',
    'hmoutilizationevents',
    'hmo_utilization_events',
  ],
};

const getCollection = (
  key: keyof typeof collectionCandidates,
) => {
  const db = mongoose.connection.db;

  if (!db) {
    return null;
  }

  const candidates = collectionCandidates[key];

  return db.collection(
    candidates.find((candidate) =>
      // MongoDB collection names are case-sensitive on some
      // filesystems/deployments, so first inspect the actual names.
      false,
    ) ?? candidates[0],
  );
};

/**
 * Resolve a collection by checking the actual MongoDB collection names.
 *
 * This avoids assuming that the collection name used by another module
 * is exactly the same as the name used by the portal module.
 */
const resolveCollection = async (
  key: keyof typeof collectionCandidates,
) => {
  const db = mongoose.connection.db;

  if (!db) {
    return null;
  }

  const names = await db
    .listCollections({}, { nameOnly: true })
    .toArray();

  const actualNames = names.map((item) => item.name);
  const candidates = collectionCandidates[key];

  const actual = candidates.find((candidate) =>
    actualNames.some(
      (name) =>
        name.toLowerCase() === candidate.toLowerCase(),
    ),
  );

  return actual ? db.collection(actual) : null;
};

const memberName = (doc: any): string => {
  return (
    [
      doc?.firstName,
      doc?.middleName,
      doc?.lastName,
    ]
      .filter(Boolean)
      .join(' ')
      .trim() ||
    doc?.name ||
    doc?.fullName ||
    'Member'
  );
};

const providerName = (doc: any): string => {
  return (
    doc?.name ||
    [doc?.firstName, doc?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim() ||
    'Provider'
  );
};

const escapeRegex = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

async function findMember(
  hmoId: string,
  memberId: string,
) {
  const collection = await resolveCollection('members');

  if (!collection) {
    return null;
  }

  const hmo = oid(hmoId, 'HMO ID');
  const member = oid(memberId, 'member ID');

  return collection.findOne({
    _id: member,
    $or: [
      { hmoId: hmo },
      { hmoID: hmo },
      { organizationId: hmo },
    ],
  });
}

async function findProvider(
  hmoId: string,
  providerId: string,
) {
  const collection = await resolveCollection('providers');

  if (!collection) {
    return null;
  }

  const hmo = oid(hmoId, 'HMO ID');
  const provider = oid(providerId, 'provider ID');

  return collection.findOne({
    _id: provider,
    $or: [
      { hmoId: hmo },
      { hmoID: hmo },
      { organizationId: hmo },
    ],
  });
}

export class HmoPortalsService {
  // ---------------------------------------------------------------------------
  // MEMBER PORTAL
  // ---------------------------------------------------------------------------

  async getMemberProfile(
    hmoId: string,
    memberId: string,
  ) {
    const member = await findMember(hmoId, memberId);

    if (!member) {
      return null;
    }

    const profile =
      await MemberPortalProfileModel.findOne({
        hmoId: oid(hmoId, 'HMO ID'),
        memberId: oid(memberId, 'member ID'),
      }).lean();

    return {
      member,
      portalProfile: profile,
    };
  }

  async upsertMemberProfile(
    hmoId: string,
    memberId: string,
    input: MemberPortalProfileInput,
  ) {
    const member = await findMember(hmoId, memberId);

    if (!member) {
      throw new Error('Member not found for this HMO');
    }

    const hmoObjectId = oid(hmoId, 'HMO ID');
    const memberObjectId = oid(memberId, 'member ID');

    return MemberPortalProfileModel.findOneAndUpdate(
      {
        hmoId: hmoObjectId,
        memberId: memberObjectId,
      },
      {
        $set: {
          ...input,
          hmoId: hmoObjectId,
          memberId: memberObjectId,
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      },
    ).lean();
  }

  async getMemberDashboard(
    hmoId: string,
    memberId: string,
  ) {
    const member = await findMember(hmoId, memberId);

    if (!member) {
      return null;
    }

    const hmo = oid(hmoId, 'HMO ID');
    const mid = oid(memberId, 'member ID');

    const claims = await resolveCollection('claims');
    const preAuths = await resolveCollection('preAuths');
    const invoices = await resolveCollection('invoices');
    const payments = await resolveCollection('payments');
    const utilization = await resolveCollection('utilization');

    const [
      claimCount,
      pendingClaims,
      preAuthCount,
      invoiceCount,
      paymentTotal,
      utilizationCount,
    ] = await Promise.all([
      claims
        ? claims.countDocuments({
            hmoId: hmo,
            memberId: mid,
          })
        : 0,

      claims
        ? claims.countDocuments({
            hmoId: hmo,
            memberId: mid,
            status: {
              $in: [
                'SUBMITTED',
                'UNDER_REVIEW',
                'PENDING',
              ],
            },
          })
        : 0,

      preAuths
        ? preAuths.countDocuments({
            hmoId: hmo,
            memberId: mid,
          })
        : 0,

      invoices
        ? invoices.countDocuments({
            hmoId: hmo,
            memberId: mid,
          })
        : 0,

      payments
        ? payments
            .aggregate([
              {
                $match: {
                  hmoId: hmo,
                  memberId: mid,
                },
              },
              {
                $group: {
                  _id: null,
                  total: {
                    $sum: {
                      $ifNull: ['$amount', 0],
                    },
                  },
                },
              },
            ])
            .toArray()
            .then((rows) =>
              Number(rows[0]?.total || 0),
            )
        : 0,

      utilization
        ? utilization.countDocuments({
            hmoId: hmo,
            memberId: mid,
          })
        : 0,
    ]);

    return {
      member: {
        id: String(member._id),
        name: memberName(member),
        policyNumber:
          member.policyNumber ||
          member.membershipNumber ||
          member.memberNumber,
        status: member.status,
        planId:
          member.planId ||
          member.healthPlanId,
        effectiveFrom: member.effectiveFrom,
        effectiveTo: member.effectiveTo,
      },

      metrics: {
        claimCount,
        pendingClaims,
        preAuthCount,
        invoiceCount,
        paymentTotal,
        utilizationCount,
      },
    };
  }

  async getMemberBenefits(
    hmoId: string,
    memberId: string,
  ) {
    const member = await findMember(hmoId, memberId);

    if (!member) {
      return null;
    }

    const planId =
      member.planId ||
      member.healthPlanId ||
      member.healthPlan;

    if (!planId) {
      return {
        plan: null,
        benefits: [],
      };
    }

    const plans = await resolveCollection('plans');
    const benefits = await resolveCollection('benefits');

    if (!plans) {
      return {
        plan: null,
        benefits: [],
      };
    }

    const hmo = oid(hmoId, 'HMO ID');
    const planObjectId = oid(
      String(planId),
      'plan ID',
    );

    const plan = await plans.findOne({
      _id: planObjectId,
      $or: [
        { hmoId: hmo },
        { hmoID: hmo },
        { organizationId: hmo },
      ],
    });

    if (!plan) {
      return {
        plan: null,
        benefits: [],
      };
    }

    const ids = Array.isArray(plan.benefitIds)
      ? plan.benefitIds
          .filter(Boolean)
          .map((id: any) =>
            Types.ObjectId.isValid(String(id))
              ? new Types.ObjectId(String(id))
              : null,
          )
          .filter(
            (id: Types.ObjectId | null): id is Types.ObjectId =>
              id !== null,
          )
      : [];

    const items =
      benefits && ids.length
        ? await benefits
            .find({
              _id: {
                $in: ids,
              },
              $or: [
                { hmoId: hmo },
                { hmoID: hmo },
                { organizationId: hmo },
              ],
            })
            .toArray()
        : [];

    return {
      plan,
      benefits: items,
    };
  }

  async listMemberProviders(
    hmoId: string,
    filters: {
      page?: any;
      limit?: any;
      search?: string;
    },
  ) {
    const collection =
      await resolveCollection('providers');

    if (!collection) {
      return {
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      } as Paginated<any>;
    }

    const {
      page,
      limit,
      skip,
    } = pageArgs(
      filters.page,
      filters.limit,
    );

    const hmo = oid(hmoId, 'HMO ID');

    const query: any = {
      $or: [
        { hmoId: hmo },
        { hmoID: hmo },
        { organizationId: hmo },
      ],
    };

    if (filters.search?.trim()) {
      const rx = new RegExp(
        escapeRegex(filters.search.trim()),
        'i',
      );

      query.$and = [
        {
          $or: [
            { name: rx },
            { code: rx },
            { providerType: rx },
            { specialty: rx },
            { city: rx },
          ],
        },
      ];
    }

    const [
      items,
      total,
    ] = await Promise.all([
      collection
        .find(query, {
          projection: {
            name: 1,
            code: 1,
            providerType: 1,
            specialty: 1,
            address: 1,
            city: 1,
            state: 1,
            status: 1,
            accreditationStatus: 1,
            phone: 1,
            email: 1,
          },
        })
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .toArray(),

      collection.countDocuments(query),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(
        total / limit,
      ),
    };
  }

  async listMemberRecords(
    hmoId: string,
    memberId: string,
    type:
      | 'claims'
      | 'preAuths'
      | 'invoices'
      | 'utilization',
  ) {
    const collection =
      await resolveCollection(
        type === 'claims'
          ? 'claims'
          : type === 'preAuths'
            ? 'preAuths'
            : type === 'invoices'
              ? 'invoices'
              : 'utilization',
      );

    if (!collection) {
      return [];
    }

    const hmo = oid(hmoId, 'HMO ID');
    const mid = oid(
      memberId,
      'member ID',
    );

    return collection
      .find({
        hmoId: hmo,
        memberId: mid,
      })
      .sort({
        createdAt: -1,
        serviceDate: -1,
        treatmentDate: -1,
      })
      .limit(200)
      .toArray();
  }

  async listMemberNotifications(
    hmoId: string,
    memberId: string,
  ) {
    return PortalNotificationModel.find({
      hmoId: oid(hmoId, 'HMO ID'),
      recipientType: 'MEMBER',
      recipientId: oid(
        memberId,
        'member ID',
      ),
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
  }

  async markNotificationRead(
    hmoId: string,
    memberId: string,
    notificationId: string,
  ) {
    return PortalNotificationModel.findOneAndUpdate(
      {
        _id: oid(
          notificationId,
          'notification ID',
        ),
        hmoId: oid(hmoId, 'HMO ID'),
        recipientType: 'MEMBER',
        recipientId: oid(
          memberId,
          'member ID',
        ),
      },
      {
        $set: {
          readAt: new Date(),
        },
      },
      {
        new: true,
      },
    ).lean();
  }

  // ---------------------------------------------------------------------------
  // PROVIDER PORTAL
  // ---------------------------------------------------------------------------

  async getProviderProfile(
    hmoId: string,
    providerId: string,
  ) {
    const provider = await findProvider(
      hmoId,
      providerId,
    );

    if (!provider) {
      return null;
    }

    const profile =
      await ProviderPortalProfileModel.findOne({
        hmoId: oid(hmoId, 'HMO ID'),
        providerId: oid(
          providerId,
          'provider ID',
        ),
      }).lean();

    return {
      provider,
      portalProfile: profile,
    };
  }

  async upsertProviderProfile(
    hmoId: string,
    providerId: string,
    input: ProviderPortalProfileInput,
  ) {
    const provider = await findProvider(
      hmoId,
      providerId,
    );

    if (!provider) {
      throw new Error(
        'Provider not found for this HMO',
      );
    }

    const hmoObjectId = oid(
      hmoId,
      'HMO ID',
    );

    const providerObjectId = oid(
      providerId,
      'provider ID',
    );

    return ProviderPortalProfileModel.findOneAndUpdate(
      {
        hmoId: hmoObjectId,
        providerId: providerObjectId,
      },
      {
        $set: {
          ...input,
          hmoId: hmoObjectId,
          providerId: providerObjectId,
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      },
    ).lean();
  }

  async getProviderDashboard(
    hmoId: string,
    providerId: string,
  ) {
    const provider = await findProvider(
      hmoId,
      providerId,
    );

    if (!provider) {
      return null;
    }

    const hmo = oid(hmoId, 'HMO ID');
    const pid = oid(
      providerId,
      'provider ID',
    );

    const claims =
      await resolveCollection('claims');

    const preAuths =
      await resolveCollection('preAuths');

    const settlements =
      await resolveCollection('settlements');

    const [
      claimCount,
      pendingClaims,
      preAuthCount,
      settlementTotal,
    ] = await Promise.all([
      claims
        ? claims.countDocuments({
            hmoId: hmo,
            providerId: pid,
          })
        : 0,

      claims
        ? claims.countDocuments({
            hmoId: hmo,
            providerId: pid,
            status: {
              $in: [
                'SUBMITTED',
                'UNDER_REVIEW',
                'PENDING',
              ],
            },
          })
        : 0,

      preAuths
        ? preAuths.countDocuments({
            hmoId: hmo,
            providerId: pid,
          })
        : 0,

      settlements
        ? settlements
            .aggregate([
              {
                $match: {
                  hmoId: hmo,
                  providerId: pid,
                },
              },
              {
                $group: {
                  _id: null,
                  total: {
                    $sum: {
                      $ifNull: [
                        '$amount',
                        {
                          $ifNull: [
                            '$totalAmount',
                            0,
                          ],
                        },
                      ],
                    },
                  },
                },
              },
            ])
            .toArray()
            .then((rows) =>
              Number(
                rows[0]?.total || 0,
              ),
            )
        : 0,
    ]);

    return {
      provider: {
        id: String(provider._id),
        name: providerName(provider),
        code: provider.code,
        status: provider.status,
        providerType:
          provider.providerType,
      },

      metrics: {
        claimCount,
        pendingClaims,
        preAuthCount,
        settlementTotal,
      },
    };
  }

  async searchProviderMembers(
    hmoId: string,
    filters: ProviderMemberQueryFilters,
  ) {
    const collection =
      await resolveCollection('members');

    if (!collection) {
      return {
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      } as Paginated<any>;
    }

    const {
      page,
      limit,
      skip,
    } = pageArgs(
      filters.page,
      filters.limit,
    );

    const hmo = oid(hmoId, 'HMO ID');

    const query: any = {
      $or: [
        { hmoId: hmo },
        { hmoID: hmo },
        { organizationId: hmo },
      ],
    };

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.search?.trim()) {
      const rx = new RegExp(
        escapeRegex(filters.search.trim()),
        'i',
      );

      query.$and = [
        {
          $or: [
            { firstName: rx },
            { lastName: rx },
            { policyNumber: rx },
            { membershipNumber: rx },
            { memberNumber: rx },
            { email: rx },
            { phone: rx },
          ],
        },
      ];
    }

    const [
      items,
      total,
    ] = await Promise.all([
      collection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),

      collection.countDocuments(query),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(
        total / limit,
      ),
    };
  }

  async providerMemberEligibility(
    hmoId: string,
    providerId: string,
    memberId: string,
  ) {
    const provider = await findProvider(
      hmoId,
      providerId,
    );

    if (!provider) {
      throw new Error(
        'Provider not found for this HMO',
      );
    }

    const member = await findMember(
      hmoId,
      memberId,
    );

    if (!member) {
      return {
        eligible: false,
        reason: 'Member not found',
      };
    }

    const active = [
      'ACTIVE',
      'ELIGIBLE',
      'ENROLLED',
    ].includes(
      String(
        member.status || '',
      ).toUpperCase(),
    );

    const effectiveFrom =
      member.effectiveFrom
        ? new Date(
            member.effectiveFrom,
          )
        : null;

    const effectiveTo =
      member.effectiveTo
        ? new Date(
            member.effectiveTo,
          )
        : null;

    const now = new Date();

    const inDate =
      (!effectiveFrom ||
        now >= effectiveFrom) &&
      (!effectiveTo ||
        now <= effectiveTo);

    return {
      eligible:
        active && inDate,

      reason:
        active && inDate
          ? 'Member is active and within coverage dates'
          : 'Member is not currently eligible',

      member,
    };
  }

  async providerClaims(
    hmoId: string,
    providerId: string,
    filters: any,
  ) {
    const collection =
      await resolveCollection('claims');

    if (!collection) {
      return {
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      } as Paginated<any>;
    }

    const {
      page,
      limit,
      skip,
    } = pageArgs(
      filters.page,
      filters.limit,
    );

    const query: any = {
      hmoId: oid(hmoId, 'HMO ID'),
      providerId: oid(
        providerId,
        'provider ID',
      ),
    };

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.memberId) {
      query.memberId = oid(
        filters.memberId,
        'member ID',
      );
    }

    const [
      items,
      total,
    ] = await Promise.all([
      collection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),

      collection.countDocuments(query),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(
        total / limit,
      ),
    };
  }

  async providerAuthorizations(
    hmoId: string,
    providerId: string,
    filters: any,
  ) {
    const collection =
      await resolveCollection('preAuths');

    if (!collection) {
      return {
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      } as Paginated<any>;
    }

    const {
      page,
      limit,
      skip,
    } = pageArgs(
      filters.page,
      filters.limit,
    );

    const query: any = {
      hmoId: oid(hmoId, 'HMO ID'),
      providerId: oid(
        providerId,
        'provider ID',
      ),
    };

    if (filters.status) {
      query.status = filters.status;
    }

    const [
      items,
      total,
    ] = await Promise.all([
      collection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),

      collection.countDocuments(query),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(
        total / limit,
      ),
    };
  }

  async providerSettlements(
    hmoId: string,
    providerId: string,
    filters: any,
  ) {
    const collection =
      await resolveCollection('settlements');

    if (!collection) {
      return {
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      } as Paginated<any>;
    }

    const {
      page,
      limit,
      skip,
    } = pageArgs(
      filters.page,
      filters.limit,
    );

    const query: any = {
      hmoId: oid(hmoId, 'HMO ID'),
      providerId: oid(
        providerId,
        'provider ID',
      ),
    };

    if (filters.status) {
      query.status = filters.status;
    }

    const [
      items,
      total,
    ] = await Promise.all([
      collection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),

      collection.countDocuments(query),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(
        total / limit,
      ),
    };
  }

  async createProviderAuthorization(
    hmoId: string,
    providerId: string,
    input: CreateProviderAuthorizationInput,
  ) {
    const provider = await findProvider(
      hmoId,
      providerId,
    );

    if (!provider) {
      throw new Error(
        'Provider not found for this HMO',
      );
    }

    const collection =
      await resolveCollection('preAuths');

    if (!collection) {
      throw new Error(
        'Pre-authorization collection is not available',
      );
    }

    const now = new Date();

    const document = {
      hmoId: oid(hmoId, 'HMO ID'),

      providerId: oid(
        providerId,
        'provider ID',
      ),

      memberId: oid(
        input.memberId,
        'member ID',
      ),

      benefitId: input.benefitId
        ? oid(
            input.benefitId,
            'benefit ID',
          )
        : undefined,

      benefitCode:
        input.benefitCode,

      serviceCode:
        input.serviceCode,

      serviceName:
        input.serviceName,

      diagnosisCodes:
        input.diagnosisCodes || [],

      requestedAmount:
        input.requestedAmount,

      requestedDate:
        input.requestedDate
          ? new Date(
              input.requestedDate,
            )
          : now,

      clinicalNotes:
        input.clinicalNotes,

      referralProviderId:
        input.referralProviderId
          ? oid(
              input.referralProviderId,
              'referral provider ID',
            )
          : undefined,

      status: 'PENDING',

      createdAt: now,
      updatedAt: now,
    };

    const result =
      await collection.insertOne(
        document as any,
      );

    return {
      ...document,
      _id: result.insertedId,
    };
  }

  async createProviderClaim(
    hmoId: string,
    providerId: string,
    input: CreateProviderClaimInput,
  ) {
    const provider = await findProvider(
      hmoId,
      providerId,
    );

    if (!provider) {
      throw new Error(
        'Provider not found for this HMO',
      );
    }

    const collection =
      await resolveCollection('claims');

    if (!collection) {
      throw new Error(
        'Claims collection is not available',
      );
    }

    const treatmentDate =
      new Date(input.treatmentDate);

    if (
      Number.isNaN(
        treatmentDate.getTime(),
      )
    ) {
      throw new Error(
        'Invalid treatmentDate',
      );
    }

    if (
      !Array.isArray(input.items) ||
      input.items.length === 0
    ) {
      throw new Error(
        'At least one claim item is required',
      );
    }

    const items =
      input.items.map((item) => {
        const quantity =
          Number(
            item.quantity ?? 1,
          );

        const unitAmount =
          Number(
            item.unitAmount ?? 0,
          );

        const claimedAmount =
          Number(
            item.claimedAmount ??
              unitAmount * quantity,
          );

        if (
          !item.serviceName?.trim()
        ) {
          throw new Error(
            'Each claim item requires serviceName',
          );
        }

        if (
          !Number.isFinite(
            quantity,
          ) ||
          quantity <= 0
        ) {
          throw new Error(
            'Invalid claim item quantity',
          );
        }

        if (
          !Number.isFinite(
            unitAmount,
          ) ||
          unitAmount < 0
        ) {
          throw new Error(
            'Invalid claim item unitAmount',
          );
        }

        if (
          !Number.isFinite(
            claimedAmount,
          ) ||
          claimedAmount < 0
        ) {
          throw new Error(
            'Invalid claim item amount',
          );
        }

        return {
          serviceCode:
            item.serviceCode,

          serviceName:
            item.serviceName.trim(),

          quantity,

          unitAmount,

          claimedAmount,

          approvedAmount:
            undefined,
        };
      });

    const totalClaimedAmount =
      items.reduce(
        (sum, item) =>
          sum +
          item.claimedAmount,
        0,
      );

    const now = new Date();

    const document = {
      hmoId: oid(
        hmoId,
        'HMO ID',
      ),

      providerId: oid(
        providerId,
        'provider ID',
      ),

      memberId: oid(
        input.memberId,
        'member ID',
      ),

      claimNumber:
        input.claimNumber
          ?.trim()
          .toUpperCase(),

      preAuthorizationId:
        input.preAuthorizationId
          ? oid(
              input.preAuthorizationId,
              'pre-authorization ID',
            )
          : undefined,

      diagnosis:
        input.diagnosis?.trim(),

      icdCode:
        input.icdCode
          ?.trim()
          .toUpperCase(),

      treatmentDate,

      submissionDate: now,

      items,

      totalClaimedAmount,

      status: 'SUBMITTED',

      notes:
        input.notes?.trim(),

      createdAt: now,
      updatedAt: now,
    };

    const result =
      await collection.insertOne(
        document as any,
      );

    return {
      ...document,
      _id: result.insertedId,
    };
  }
}

export const hmoPortalsService =
  new HmoPortalsService();