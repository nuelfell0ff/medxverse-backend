import mongoose, { Types } from 'mongoose';
import { AnalyticsAuditLogModel, AnalyticsConsentModel, AnalyticsReportModel, ComplianceReportModel, } from './analytics.model.js';
const err = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
const oid = (value, field) => {
    if (!Types.ObjectId.isValid(value)) {
        throw err(`Invalid ${field}`);
    }
    return new Types.ObjectId(value);
};
const optionalModel = (names) => {
    for (const name of names) {
        const registered = mongoose.models[name];
        if (registered) {
            return registered;
        }
    }
    return null;
};
const requiredModel = (name) => {
    const registered = mongoose.models[name];
    if (!registered) {
        throw err(`${name} model is not registered. Ensure the corresponding HMO module is loaded before analytics.`);
    }
    return registered;
};
const rangeDates = (query) => {
    const to = query.to ? new Date(query.to) : new Date();
    if (Number.isNaN(to.getTime())) {
        throw err('Invalid to date');
    }
    const from = query.from ? new Date(query.from) : new Date(to);
    if (!query.from) {
        const days = query.range === '7d'
            ? 7
            : query.range === '90d'
                ? 90
                : query.range === '12m'
                    ? 365
                    : 30;
        from.setDate(from.getDate() - days);
    }
    if (Number.isNaN(from.getTime())) {
        throw err('Invalid from date');
    }
    if (from > to) {
        throw err('from date must be before to date');
    }
    return { from, to };
};
const number = (value) => Number(value || 0);
const percent = (part, total) => total > 0
    ? Math.round((part / total) * 10000) / 100
    : 0;
const csvEscape = (value) => {
    const text = value == null
        ? ''
        : typeof value === 'object'
            ? JSON.stringify(value)
            : String(value);
    return /[",\n]/.test(text)
        ? `"${text.replace(/"/g, '""')}"`
        : text;
};
export class HMOAnalyticsService {
    /**
     * Creates an analytics audit event.
     *
     * resourceId is intentionally the fifth argument because callers
     * use it to identify the report, consent, compliance report, etc.
     *
     * reqMeta remains optional and can be supplied through metadata
     * when request-level information is available.
     */
    async audit(hmoId, actorId, action, resource, resourceId, metadata) {
        await AnalyticsAuditLogModel.create({
            hmoId: oid(hmoId, 'HMO ID'),
            actorId: actorId && Types.ObjectId.isValid(actorId)
                ? new Types.ObjectId(actorId)
                : undefined,
            action,
            resource,
            resourceId,
            success: true,
            ip: typeof metadata?.ip === 'string'
                ? metadata.ip
                : undefined,
            userAgent: typeof metadata?.userAgent === 'string'
                ? metadata.userAgent
                : undefined,
            metadata,
        });
    }
    async summary(hmoId, query = {}) {
        const owner = oid(hmoId, 'HMO ID');
        const { from, to } = rangeDates(query);
        const dateMatch = {
            $gte: from,
            $lte: to,
        };
        const ClaimModel = requiredModel('Claim');
        const HealthPlanModel = requiredModel('HealthPlan');
        const claims = await ClaimModel.aggregate([
            {
                $match: {
                    hmoId: owner,
                    treatmentDate: dateMatch,
                },
            },
            {
                $facet: {
                    totals: [
                        {
                            $group: {
                                _id: null,
                                total: { $sum: 1 },
                                claimed: {
                                    $sum: '$totalClaimedAmount',
                                },
                                approved: {
                                    $sum: {
                                        $ifNull: ['$totalApprovedAmount', 0],
                                    },
                                },
                                payable: {
                                    $sum: {
                                        $ifNull: ['$payableAmount', 0],
                                    },
                                },
                                paid: {
                                    $sum: {
                                        $cond: [
                                            { $eq: ['$status', 'PAID'] },
                                            {
                                                $ifNull: ['$payableAmount', 0],
                                            },
                                            0,
                                        ],
                                    },
                                },
                                duplicateRisk: {
                                    $sum: {
                                        $cond: ['$duplicateRisk', 1, 0],
                                    },
                                },
                            },
                        },
                    ],
                    status: [
                        {
                            $group: {
                                _id: '$status',
                                count: { $sum: 1 },
                                amount: {
                                    $sum: '$totalClaimedAmount',
                                },
                            },
                        },
                    ],
                    monthly: [
                        {
                            $group: {
                                _id: {
                                    $dateToString: {
                                        format: '%Y-%m',
                                        date: '$treatmentDate',
                                    },
                                },
                                count: { $sum: 1 },
                                claimed: {
                                    $sum: '$totalClaimedAmount',
                                },
                                approved: {
                                    $sum: {
                                        $ifNull: ['$totalApprovedAmount', 0],
                                    },
                                },
                                paid: {
                                    $sum: {
                                        $cond: [
                                            { $eq: ['$status', 'PAID'] },
                                            {
                                                $ifNull: ['$payableAmount', 0],
                                            },
                                            0,
                                        ],
                                    },
                                },
                            },
                        },
                        {
                            $sort: {
                                _id: 1,
                            },
                        },
                    ],
                    providers: [
                        {
                            $group: {
                                _id: '$providerId',
                                count: { $sum: 1 },
                                amount: {
                                    $sum: '$totalClaimedAmount',
                                },
                            },
                        },
                        {
                            $sort: {
                                amount: -1,
                            },
                        },
                        {
                            $limit: 10,
                        },
                    ],
                },
            },
        ]).exec();
        const c = claims[0] || {};
        const totals = c.totals?.[0] || {};
        const statusMap = new Map((c.status || []).map((x) => [x._id, x]));
        const preAuth = optionalModel([
            'PreAuthorization',
            'PreAuth',
            'PreAuthorizationRequest',
        ]);
        const invoice = optionalModel([
            'HMOInvoice',
            'Invoice',
        ]);
        const payment = optionalModel([
            'HMOPayment',
            'Payment',
        ]);
        const settlement = optionalModel([
            'HMOSettlement',
            'Settlement',
            'ProviderSettlement',
        ]);
        const enrollee = optionalModel([
            'Enrollee',
            'HMOEnrollee',
            'HmoEnrollee',
        ]);
        const provider = optionalModel([
            'HMOProvider',
            'HmoProvider',
            'Provider',
        ]);
        const countAndSums = async (m, filter, sumFields) => {
            if (!m) {
                return {
                    count: 0,
                    sums: Object.fromEntries(sumFields.map((f) => [f, 0])),
                };
            }
            const group = {
                _id: null,
                count: { $sum: 1 },
            };
            for (const field of sumFields) {
                group[field] = {
                    $sum: {
                        $ifNull: [`$${field}`, 0],
                    },
                };
            }
            const rows = await m
                .aggregate([
                {
                    $match: filter,
                },
                {
                    $group: group,
                },
            ])
                .exec();
            const row = rows[0] || {};
            return {
                count: number(row.count),
                sums: Object.fromEntries(sumFields.map((f) => [
                    f,
                    number(row[f]),
                ])),
            };
        };
        const [authTotals, invoiceTotals, paymentTotals, settlementTotals, enrolleeTotals, providerTotals, planTotal, auditCount, accessCount, failedAccessCount, consentGrant, consentRevoke,] = await Promise.all([
            countAndSums(preAuth, {
                hmoId: owner,
                createdAt: dateMatch,
            }, [
                'totalRequestedAmount',
                'totalApprovedAmount',
            ]),
            countAndSums(invoice, {
                hmoId: owner,
                createdAt: dateMatch,
            }, [
                'totalAmount',
                'amount',
                'balance',
            ]),
            countAndSums(payment, {
                hmoId: owner,
                createdAt: dateMatch,
                status: {
                    $in: [
                        'SUCCESS',
                        'PAID',
                        'COMPLETED',
                    ],
                },
            }, [
                'amount',
                'totalAmount',
            ]),
            countAndSums(settlement, {
                hmoId: owner,
                createdAt: dateMatch,
                status: {
                    $in: [
                        'PAID',
                        'COMPLETED',
                    ],
                },
            }, [
                'netAmount',
                'amount',
            ]),
            countAndSums(enrollee, {
                hmoId: owner,
            }, []),
            countAndSums(provider, {
                hmoId: owner,
            }, []),
            HealthPlanModel.countDocuments({
                hmoId: owner,
            }),
            AnalyticsAuditLogModel.countDocuments({
                hmoId: owner,
                createdAt: dateMatch,
            }),
            AnalyticsAuditLogModel.countDocuments({
                hmoId: owner,
                createdAt: dateMatch,
                action: {
                    $regex: /ACCESS/i,
                },
            }),
            AnalyticsAuditLogModel.countDocuments({
                hmoId: owner,
                createdAt: dateMatch,
                action: {
                    $regex: /FAILED|DENIED/i,
                },
                success: false,
            }),
            AnalyticsConsentModel.countDocuments({
                hmoId: owner,
                createdAt: dateMatch,
                status: 'GRANTED',
            }),
            AnalyticsConsentModel.countDocuments({
                hmoId: owner,
                createdAt: dateMatch,
                status: 'REVOKED',
            }),
        ]);
        const activeEnrollees = enrollee
            ? await enrollee.countDocuments({
                hmoId: owner,
                status: {
                    $in: ['ACTIVE', 'ENROLLED'],
                },
            })
            : 0;
        const suspendedEnrollees = enrollee
            ? await enrollee.countDocuments({
                hmoId: owner,
                status: 'SUSPENDED',
            })
            : 0;
        const expiredEnrollees = enrollee
            ? await enrollee.countDocuments({
                hmoId: owner,
                status: 'EXPIRED',
            })
            : 0;
        const newEnrollees = enrollee
            ? await enrollee.countDocuments({
                hmoId: owner,
                createdAt: dateMatch,
            })
            : 0;
        const activeProviders = provider
            ? await provider.countDocuments({
                hmoId: owner,
                status: {
                    $in: ['ACTIVE', 'ACCREDITED'],
                },
            })
            : 0;
        const activePlans = await HealthPlanModel.countDocuments({
            hmoId: owner,
            status: 'ACTIVE',
        });
        const authRows = preAuth
            ? await preAuth
                .aggregate([
                {
                    $match: {
                        hmoId: owner,
                        createdAt: dateMatch,
                    },
                },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                    },
                },
            ])
                .exec()
            : [];
        const authMap = new Map(authRows.map((x) => [
            x._id,
            number(x.count),
        ]));
        return {
            period: {
                from: from.toISOString(),
                to: to.toISOString(),
            },
            enrolment: {
                total: enrolleeTotals.count,
                active: activeEnrollees,
                suspended: suspendedEnrollees,
                expired: expiredEnrollees,
                newInPeriod: newEnrollees,
            },
            claims: {
                total: number(totals.total),
                submitted: number(statusMap.get('SUBMITTED')?.count),
                underReview: number(statusMap.get('UNDER_REVIEW')?.count),
                approved: number(statusMap.get('APPROVED')?.count),
                rejected: number(statusMap.get('REJECTED')?.count),
                paid: number(statusMap.get('PAID')?.count),
                claimedAmount: number(totals.claimed),
                approvedAmount: number(totals.approved),
                payableAmount: number(totals.payable),
                paidAmount: number(totals.paid),
                approvalRate: percent(number(statusMap.get('APPROVED')?.count) +
                    number(statusMap.get('PAID')?.count), number(totals.total)),
                rejectionRate: percent(number(statusMap.get('REJECTED')?.count), number(totals.total)),
                duplicateRiskCount: number(totals.duplicateRisk),
                monthly: (c.monthly || []).map((x) => ({
                    month: x._id,
                    count: number(x.count),
                    claimed: number(x.claimed),
                    approved: number(x.approved),
                    paid: number(x.paid),
                })),
                byStatus: (c.status || []).map((x) => ({
                    _id: x._id,
                    count: number(x.count),
                    amount: number(x.amount),
                })),
                topProviders: (c.providers || []).map((x) => ({
                    _id: String(x._id),
                    count: number(x.count),
                    amount: number(x.amount),
                })),
            },
            authorization: {
                total: authTotals.count,
                pending: (authMap.get('PENDING') || 0) +
                    (authMap.get('NEW_REQUEST') || 0),
                approved: authMap.get('APPROVED') || 0,
                declined: (authMap.get('DECLINED') || 0) +
                    (authMap.get('REJECTED') || 0),
                requestedAmount: authTotals.sums.totalRequestedAmount ||
                    0,
                approvedAmount: authTotals.sums.totalApprovedAmount ||
                    0,
            },
            finance: {
                invoiceCount: invoiceTotals.count,
                invoicedAmount: invoiceTotals.sums.totalAmount ||
                    invoiceTotals.sums.amount ||
                    0,
                paymentCount: paymentTotals.count,
                receivedAmount: paymentTotals.sums.amount ||
                    paymentTotals.sums.totalAmount ||
                    0,
                settlementCount: settlementTotals.count,
                settledAmount: settlementTotals.sums.netAmount ||
                    settlementTotals.sums.amount ||
                    0,
            },
            providers: {
                total: providerTotals.count,
                active: activeProviders,
            },
            plans: {
                total: planTotal,
                active: activePlans,
            },
            security: {
                auditEvents: auditCount,
                accessEvents: accessCount,
                failedAccessEvents: failedAccessCount,
                consentGrants: consentGrant,
                consentRevocations: consentRevoke,
            },
        };
    }
    async generateReport(hmoId, actorId, query) {
        const summary = await this.summary(hmoId, query);
        const { from, to } = rangeDates(query);
        const reportNumber = `HMR-${new Date().getTime()}-${Math.random()
            .toString(36)
            .slice(2, 7)
            .toUpperCase()}`;
        let payload = summary;
        if (query.type === 'CLAIMS') {
            payload = summary.claims;
        }
        if (query.type === 'FINANCIAL') {
            payload = summary.finance;
        }
        if (query.type === 'ENROLLEE') {
            payload = summary.enrolment;
        }
        if (query.type === 'PROVIDER_PERFORMANCE') {
            payload = {
                providers: summary.providers,
                topProvidersByClaims: summary.claims.topProviders,
            };
        }
        if (query.type === 'COMPLIANCE_AUDIT') {
            payload = {
                security: summary.security,
                period: summary.period,
            };
        }
        if (query.type === 'UTILIZATION') {
            payload = {
                claims: summary.claims,
                authorization: summary.authorization,
            };
        }
        const format = query.format || 'JSON';
        let csv;
        if (format === 'CSV') {
            const rows = Object.entries(payload).flatMap(([section, value]) => {
                if (Array.isArray(value)) {
                    return value.map((row) => ({
                        section,
                        ...row,
                    }));
                }
                if (value &&
                    typeof value === 'object') {
                    return [
                        {
                            section,
                            ...value,
                        },
                    ];
                }
                return [
                    {
                        section,
                        value,
                    },
                ];
            });
            const keys = [
                ...new Set(rows.flatMap((r) => Object.keys(r))),
            ];
            csv = [
                keys.map(csvEscape).join(','),
                ...rows.map((r) => keys
                    .map((k) => csvEscape(r[k]))
                    .join(',')),
            ].join('\n');
        }
        const report = await AnalyticsReportModel.create({
            hmoId: oid(hmoId, 'HMO ID'),
            reportNumber,
            type: query.type,
            format,
            status: 'GENERATED',
            periodFrom: from,
            periodTo: to,
            generatedBy: actorId &&
                Types.ObjectId.isValid(actorId)
                ? new Types.ObjectId(actorId)
                : undefined,
            parameters: query,
            payload: format === 'JSON'
                ? payload
                : undefined,
            csv,
        });
        await this.audit(hmoId, actorId, 'REPORT_GENERATED', 'ANALYTICS_REPORT', String(report._id), {
            type: query.type,
            format,
        });
        return report;
    }
    async listReports(hmoId, page = 1, limit = 20) {
        const owner = oid(hmoId, 'HMO ID');
        const safePage = Math.max(1, Number(page) || 1);
        const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
        const [items, total,] = await Promise.all([
            AnalyticsReportModel.find({
                hmoId: owner,
            })
                .sort({
                createdAt: -1,
                _id: -1,
            })
                .skip((safePage - 1) *
                safeLimit)
                .limit(safeLimit)
                .select('-payload -csv')
                .lean()
                .exec(),
            AnalyticsReportModel.countDocuments({
                hmoId: owner,
            }),
        ]);
        return {
            items,
            total,
            page: safePage,
            limit: safeLimit,
            totalPages: Math.ceil(total / safeLimit),
        };
    }
    async getReport(id, hmoId) {
        return AnalyticsReportModel.findOne({
            _id: oid(id, 'report ID'),
            hmoId: oid(hmoId, 'HMO ID'),
        })
            .lean()
            .exec();
    }
    async listAudit(hmoId, query) {
        const owner = oid(hmoId, 'HMO ID');
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
        const filter = {
            hmoId: owner,
        };
        if (query.action) {
            filter.action = query.action;
        }
        if (query.resource) {
            filter.resource =
                query.resource;
        }
        if (query.actorId) {
            filter.actorId = oid(query.actorId, 'actor ID');
        }
        if (query.from ||
            query.to) {
            filter.createdAt = {};
            if (query.from) {
                filter.createdAt.$gte =
                    new Date(query.from);
            }
            if (query.to) {
                filter.createdAt.$lte =
                    new Date(query.to);
            }
        }
        const [items, total,] = await Promise.all([
            AnalyticsAuditLogModel.find(filter)
                .sort({
                createdAt: -1,
            })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean()
                .exec(),
            AnalyticsAuditLogModel.countDocuments(filter),
        ]);
        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async upsertConsent(hmoId, input, actorId) {
        const owner = oid(hmoId, 'HMO ID');
        const subjectId = oid(input.subjectId, 'subject ID');
        const now = new Date();
        const doc = await AnalyticsConsentModel.findOneAndUpdate({
            hmoId: owner,
            subjectType: input.subjectType,
            subjectId,
            purpose: input.purpose,
        }, {
            $set: {
                version: input.version,
                source: input.source,
                status: 'GRANTED',
                grantedAt: now,
                revokedAt: undefined,
                expiresAt: input.expiresAt
                    ? new Date(input.expiresAt)
                    : undefined,
            },
        }, {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
        }).exec();
        await this.audit(hmoId, actorId, 'CONSENT_GRANTED', 'CONSENT', String(doc._id), {
            purpose: input.purpose,
            subjectType: input.subjectType,
        });
        return doc;
    }
    async revokeConsent(hmoId, id, actorId) {
        const doc = await AnalyticsConsentModel.findOneAndUpdate({
            _id: oid(id, 'consent ID'),
            hmoId: oid(hmoId, 'HMO ID'),
        }, {
            $set: {
                status: 'REVOKED',
                revokedAt: new Date(),
            },
        }, {
            new: true,
        }).exec();
        if (!doc) {
            return null;
        }
        await this.audit(hmoId, actorId, 'CONSENT_REVOKED', 'CONSENT', String(doc._id));
        return doc;
    }
    async listConsents(hmoId, page = 1, limit = 25) {
        const owner = oid(hmoId, 'HMO ID');
        const safePage = Math.max(1, Number(page) || 1);
        const safeLimit = Math.min(100, Math.max(1, Number(limit) || 25));
        const [items, total,] = await Promise.all([
            AnalyticsConsentModel.find({
                hmoId: owner,
            })
                .sort({
                updatedAt: -1,
            })
                .skip((safePage - 1) *
                safeLimit)
                .limit(safeLimit)
                .lean()
                .exec(),
            AnalyticsConsentModel.countDocuments({
                hmoId: owner,
            }),
        ]);
        return {
            items,
            total,
            page: safePage,
            limit: safeLimit,
            totalPages: Math.ceil(total / safeLimit),
        };
    }
    async createComplianceReport(hmoId, actorId, input) {
        const summary = await this.summary(hmoId, {
            from: input.from,
            to: input.to,
        });
        const from = new Date(input.from);
        const to = new Date(input.to);
        const findings = [];
        if (summary.claims.total > 0 &&
            summary.claims.rejectionRate >
                25) {
            findings.push({
                code: 'HIGH_CLAIM_REJECTION_RATE',
                severity: 'MEDIUM',
                value: summary.claims
                    .rejectionRate,
            });
        }
        if (summary.claims
            .duplicateRiskCount > 0) {
            findings.push({
                code: 'DUPLICATE_RISK_CLAIMS',
                severity: 'HIGH',
                value: summary.claims
                    .duplicateRiskCount,
            });
        }
        if (summary.security
            .failedAccessEvents > 0) {
            findings.push({
                code: 'FAILED_ACCESS_EVENTS',
                severity: 'MEDIUM',
                value: summary.security
                    .failedAccessEvents,
            });
        }
        const report = await ComplianceReportModel.create({
            hmoId: oid(hmoId, 'HMO ID'),
            reportNumber: `CMP-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 7)
                .toUpperCase()}`,
            type: input.type,
            periodFrom: from,
            periodTo: to,
            status: 'READY',
            generatedBy: actorId &&
                Types.ObjectId.isValid(actorId)
                ? new Types.ObjectId(actorId)
                : undefined,
            findings,
            metrics: summary,
            notes: input.notes,
        });
        await this.audit(hmoId, actorId, 'COMPLIANCE_REPORT_GENERATED', 'COMPLIANCE_REPORT', String(report._id), {
            type: input.type,
        });
        return report;
    }
    async listCompliance(hmoId, query) {
        const owner = oid(hmoId, 'HMO ID');
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
        const filter = {
            hmoId: owner,
        };
        if (query.type) {
            filter.type = query.type;
        }
        if (query.status) {
            filter.status =
                query.status;
        }
        const [items, total,] = await Promise.all([
            ComplianceReportModel.find(filter)
                .sort({
                createdAt: -1,
            })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean()
                .exec(),
            ComplianceReportModel.countDocuments(filter),
        ]);
        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async updateComplianceStatus(hmoId, id, status, actorId, notes) {
        if (![
            'DRAFT',
            'READY',
            'SUBMITTED',
            'ACCEPTED',
            'REJECTED',
        ].includes(status)) {
            throw err('Invalid compliance status');
        }
        const update = {
            status,
        };
        if (notes !== undefined) {
            update.notes = notes;
        }
        if (status === 'SUBMITTED') {
            update.submittedAt =
                new Date();
            if (actorId &&
                Types.ObjectId.isValid(actorId)) {
                update.submittedBy =
                    new Types.ObjectId(actorId);
            }
        }
        const doc = await ComplianceReportModel.findOneAndUpdate({
            _id: oid(id, 'compliance report ID'),
            hmoId: oid(hmoId, 'HMO ID'),
        }, {
            $set: update,
        }, {
            new: true,
        }).exec();
        if (!doc) {
            return null;
        }
        await this.audit(hmoId, actorId, 'COMPLIANCE_STATUS_CHANGED', 'COMPLIANCE_REPORT', String(doc._id), {
            status,
        });
        return doc;
    }
}
export const hmoAnalyticsService = new HMOAnalyticsService();
