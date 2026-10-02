import { membersService } from './members.service.js';
const resolveHmoId = (req) => {
    const auth = req;
    const hmoId = auth.user?.hmoId ||
        auth.user?.accountId ||
        auth.account?.accountId;
    if (!hmoId) {
        throw Object.assign(new Error('Authenticated HMO account could not be resolved'), { statusCode: 401 });
    }
    return hmoId;
};
const resolveActorId = (req) => {
    const auth = req;
    return auth.user?._id;
};
export class MembersController {
    /**
     * Legacy /members creation endpoint.
     * Delegates to Enrollee Registry so member creation also records lifecycle
     * history and issues/updates the digital HMO card.
     */
    async createMember(req, res, next) {
        try {
            const member = await membersService.createMember(resolveHmoId(req), req.body, resolveActorId(req));
            res.status(201).json({ success: true, data: member });
        }
        catch (error) {
            next(error);
        }
    }
    async getMembers(req, res, next) {
        try {
            const page = req.query.page
                ? Number.parseInt(String(req.query.page), 10)
                : 1;
            const limit = req.query.limit
                ? Number.parseInt(String(req.query.limit), 10)
                : 20;
            const result = await membersService.getMembers(resolveHmoId(req), {
                page,
                limit,
                status: req.query.status,
                healthPlanId: req.query.healthPlanId,
                relationship: req.query.relationship,
                search: req.query.search,
            });
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async getMemberById(req, res, next) {
        try {
            const member = await membersService.getMemberById(String(req.params.id), resolveHmoId(req));
            if (!member) {
                res.status(404).json({
                    success: false,
                    message: 'Member not found',
                });
                return;
            }
            res.status(200).json({ success: true, data: member });
        }
        catch (error) {
            next(error);
        }
    }
    async updateMember(req, res, next) {
        try {
            const updated = await membersService.updateMember(String(req.params.id), resolveHmoId(req), req.body, resolveActorId(req));
            if (!updated) {
                res.status(404).json({
                    success: false,
                    message: 'Member not found',
                });
                return;
            }
            res.status(200).json({ success: true, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
    async updateMemberStatus(req, res, next) {
        try {
            const status = req.body?.status;
            if (!status) {
                res.status(400).json({
                    success: false,
                    message: 'Status is required',
                });
                return;
            }
            const updated = await membersService.updateMemberStatus(String(req.params.id), resolveHmoId(req), status, req.body?.reason, resolveActorId(req));
            if (!updated) {
                res.status(404).json({
                    success: false,
                    message: 'Member not found',
                });
                return;
            }
            res.status(200).json({ success: true, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
    async getDependents(req, res, next) {
        try {
            const dependents = await membersService.getDependents(String(req.params.id), resolveHmoId(req));
            res.status(200).json({ success: true, data: dependents });
        }
        catch (error) {
            next(error);
        }
    }
    async checkEligibility(req, res, next) {
        try {
            const eligibility = await membersService.checkEligibility(String(req.params.id), resolveHmoId(req), req.query.date
                ? new Date(String(req.query.date))
                : new Date());
            res.status(200).json({ success: true, data: eligibility });
        }
        catch (error) {
            next(error);
        }
    }
    async renewMember(req, res, next) {
        try {
            const updated = await membersService.renewMember(String(req.params.id), resolveHmoId(req), req.body, resolveActorId(req));
            if (!updated) {
                res.status(404).json({
                    success: false,
                    message: 'Member not found',
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: updated,
                message: 'Member renewed successfully',
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getCard(req, res, next) {
        try {
            const card = await membersService.getCard(String(req.params.id), resolveHmoId(req), resolveActorId(req));
            if (!card) {
                res.status(404).json({
                    success: false,
                    message: 'Member not found',
                });
                return;
            }
            res.status(200).json({ success: true, data: card });
        }
        catch (error) {
            next(error);
        }
    }
    async getLifecycle(req, res, next) {
        try {
            const events = await membersService.getLifecycle(String(req.params.id), resolveHmoId(req));
            res.status(200).json({ success: true, data: events });
        }
        catch (error) {
            next(error);
        }
    }
}
export const membersController = new MembersController();
