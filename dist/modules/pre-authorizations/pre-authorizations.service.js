import { Types } from 'mongoose';
import { PreAuthModel } from './pre-authorizations.model.js';
import { PreAuthStatus, } from './pre-authorizations.types.js';
export class PreAuthorizationsService {
    isValidObjectId(value) {
        return Types.ObjectId.isValid(value);
    }
    objectId(value, field) {
        if (!this.isValidObjectId(value)) {
            throw new Error(`Invalid ${field}`);
        }
        return new Types.ObjectId(value);
    }
    generateRequestNumber() {
        const random = Math.floor(100000 + Math.random() * 900000).toString();
        return `PA-${Date.now().toString().slice(-6)}-${random}`;
    }
    generateAuthorizationCode() {
        const random = Math.floor(100000 + Math.random() * 900000).toString();
        return `AUTH-${Date.now().toString().slice(-6)}-${random}`;
    }
    canTransition(from, to) {
        if (from === to)
            return true;
        const transitions = {
            [PreAuthStatus.NEW_REQUEST]: [PreAuthStatus.PENDING, PreAuthStatus.APPROVED, PreAuthStatus.DECLINED, PreAuthStatus.CANCELLED],
            [PreAuthStatus.PENDING]: [PreAuthStatus.PENDING, PreAuthStatus.APPROVED, PreAuthStatus.DECLINED, PreAuthStatus.CANCELLED],
            [PreAuthStatus.APPROVED]: [],
            [PreAuthStatus.DECLINED]: [],
            [PreAuthStatus.CANCELLED]: [],
        };
        return transitions[from].includes(to);
    }
    async createPreAuth(input) {
        if (!input.memberId) {
            throw new Error('memberId is required');
        }
        if (!input.providerId) {
            throw new Error('providerId is required');
        }
        if (!input.diagnosisCode?.trim()) {
            throw new Error('diagnosisCode is required');
        }
        if (!input.diagnosisDescription?.trim()) {
            throw new Error('diagnosisDescription is required');
        }
        if (!Array.isArray(input.procedures) || input.procedures.length === 0) {
            throw new Error('At least one procedure is required');
        }
        const procedures = input.procedures.map((p) => {
            if (!p.code?.trim()) {
                throw new Error('Each procedure requires a code');
            }
            if (!p.description?.trim()) {
                throw new Error(`Procedure ${p.code} requires a description`);
            }
            if (!Number.isFinite(p.requestedAmount) || p.requestedAmount < 0) {
                throw new Error(`Invalid requested amount for procedure ${p.code}`);
            }
            return {
                code: p.code.trim().toUpperCase(),
                description: p.description.trim(),
                requestedAmount: p.requestedAmount,
                approvedAmount: 0,
            };
        });
        const totalRequested = procedures.reduce((sum, p) => sum + p.requestedAmount, 0);
        return PreAuthModel.create({
            ...input,
            hmoId: this.objectId(input.hmoId, 'hmoId'),
            memberId: this.objectId(input.memberId, 'memberId'),
            providerId: this.objectId(input.providerId, 'providerId'),
            diagnosisCode: input.diagnosisCode.trim().toUpperCase(),
            diagnosisDescription: input.diagnosisDescription.trim(),
            procedures,
            requestNumber: this.generateRequestNumber(),
            status: PreAuthStatus.NEW_REQUEST,
            totalRequestedAmount: totalRequested,
            totalApprovedAmount: 0,
            history: [
                {
                    status: PreAuthStatus.NEW_REQUEST,
                    reviewedAt: new Date(),
                    totalApprovedAmount: 0,
                },
            ],
        });
    }
    async getPreAuths(hmoId, query) {
        const hmoObjectId = this.objectId(hmoId, 'hmoId');
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
        const skip = (page - 1) * limit;
        const filter = {
            hmoId: hmoObjectId,
        };
        if (query.status) {
            filter.status = query.status;
        }
        if (query.priority) {
            filter.priority = query.priority;
        }
        if (query.memberId) {
            filter.memberId = this.objectId(query.memberId, 'memberId');
        }
        if (query.providerId) {
            filter.providerId = this.objectId(query.providerId, 'providerId');
        }
        const search = query.search?.trim();
        if (search) {
            const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filter.$or = [
                {
                    requestNumber: {
                        $regex: escaped,
                        $options: 'i',
                    },
                },
                {
                    diagnosisCode: {
                        $regex: escaped,
                        $options: 'i',
                    },
                },
                {
                    diagnosisDescription: {
                        $regex: escaped,
                        $options: 'i',
                    },
                },
            ];
        }
        const [requests, total] = await Promise.all([
            PreAuthModel.find(filter)
                .populate('memberId', 'firstName lastName policyNumber email')
                .populate('providerId', 'name code category')
                .populate('reviewedBy', 'firstName lastName email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            PreAuthModel.countDocuments(filter),
        ]);
        return {
            requests,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getPreAuthById(id, hmoId) {
        return PreAuthModel.findOne({
            _id: this.objectId(id, 'pre-authorization id'),
            hmoId: this.objectId(hmoId, 'hmoId'),
        })
            .populate('memberId')
            .populate('providerId')
            .populate('reviewedBy', 'firstName lastName email')
            .exec();
    }
    async reviewPreAuth(id, hmoId, reviewerId, input) {
        const preAuth = await PreAuthModel.findOne({
            _id: this.objectId(id, 'pre-authorization id'),
            hmoId: this.objectId(hmoId, 'hmoId'),
        });
        if (!preAuth) {
            return null;
        }
        if (!input.status) {
            throw new Error('status is required');
        }
        if (!this.canTransition(preAuth.status, input.status)) {
            throw new Error(`Cannot change pre-authorization from ${preAuth.status} to ${input.status}`);
        }
        if (input.status === PreAuthStatus.DECLINED &&
            !input.decisionReason?.trim()) {
            throw new Error('decisionReason is required when declining a pre-authorization');
        }
        if (input.procedures) {
            const reviews = new Map(input.procedures.map((p) => [
                p.code.trim().toUpperCase(),
                p.approvedAmount,
            ]));
            let totalApproved = 0;
            preAuth.procedures = preAuth.procedures.map((proc) => {
                const approved = reviews.has(proc.code)
                    ? reviews.get(proc.code) ?? 0
                    : 0;
                if (!Number.isFinite(approved) ||
                    approved < 0 ||
                    approved > proc.requestedAmount) {
                    throw new Error(`Invalid approved amount for procedure ${proc.code}`);
                }
                totalApproved += approved;
                return {
                    code: proc.code,
                    description: proc.description,
                    requestedAmount: proc.requestedAmount,
                    approvedAmount: approved,
                };
            });
            preAuth.totalApprovedAmount = totalApproved;
        }
        else if (input.status === PreAuthStatus.APPROVED) {
            preAuth.procedures = preAuth.procedures.map((proc) => ({
                code: proc.code,
                description: proc.description,
                requestedAmount: proc.requestedAmount,
                approvedAmount: proc.requestedAmount,
            }));
            preAuth.totalApprovedAmount =
                preAuth.totalRequestedAmount;
        }
        else if (input.status === PreAuthStatus.DECLINED ||
            input.status === PreAuthStatus.CANCELLED) {
            preAuth.procedures = preAuth.procedures.map((proc) => ({
                code: proc.code,
                description: proc.description,
                requestedAmount: proc.requestedAmount,
                approvedAmount: 0,
            }));
            preAuth.totalApprovedAmount = 0;
        }
        preAuth.status = input.status;
        preAuth.decisionReason =
            input.decisionReason?.trim() || undefined;
        preAuth.reviewedBy = this.objectId(reviewerId, 'reviewerId');
        const reviewedAt = new Date();
        preAuth.reviewedAt = reviewedAt;
        if (input.status === PreAuthStatus.APPROVED) {
            const days = Math.min(365, Math.max(1, Number(input.expiresInDays) || 30));
            preAuth.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
            if (!preAuth.authorizationCode) {
                preAuth.authorizationCode = this.generateAuthorizationCode();
            }
        }
        else if (input.status === PreAuthStatus.DECLINED ||
            input.status === PreAuthStatus.CANCELLED) {
            preAuth.expiresAt = undefined;
            preAuth.authorizationCode = undefined;
        }
        preAuth.history.push({
            status: input.status,
            reason: preAuth.decisionReason,
            reviewedBy: preAuth.reviewedBy,
            reviewedAt,
            totalApprovedAmount: preAuth.totalApprovedAmount,
        });
        return preAuth.save();
    }
    async getPreAuthStats(hmoId) {
        const hmoObjectId = this.objectId(hmoId, 'hmoId');
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const [newRequests, pending, approvedToday, declined, total,] = await Promise.all([
            PreAuthModel.countDocuments({
                hmoId: hmoObjectId,
                status: PreAuthStatus.NEW_REQUEST,
            }),
            PreAuthModel.countDocuments({
                hmoId: hmoObjectId,
                status: PreAuthStatus.PENDING,
            }),
            PreAuthModel.countDocuments({
                hmoId: hmoObjectId,
                status: PreAuthStatus.APPROVED,
                reviewedAt: {
                    $gte: todayStart,
                },
            }),
            PreAuthModel.countDocuments({
                hmoId: hmoObjectId,
                status: PreAuthStatus.DECLINED,
            }),
            PreAuthModel.countDocuments({
                hmoId: hmoObjectId,
            }),
        ]);
        return {
            newRequests,
            pending,
            approvedToday,
            declined,
            total,
        };
    }
}
export const preAuthorizationsService = new PreAuthorizationsService();
