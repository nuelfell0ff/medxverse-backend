import { membersService } from './members.service.js';
export class MembersController {
    async createMember(req, res, next) {
        try {
            const authReq = req;
            const hmoId = authReq.user.hmoId;
            const member = await membersService.createMember(hmoId, req.body);
            res.status(201).json({ success: true, data: member });
        }
        catch (error) {
            next(error);
        }
    }
    async getMembers(req, res, next) {
        try {
            const authReq = req;
            const hmoId = authReq.user.hmoId;
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
            const status = req.query.status;
            const benefitPlanId = req.query.benefitPlanId;
            const relationship = req.query.relationship;
            const search = req.query.search;
            const result = await membersService.getMembers(hmoId, {
                page,
                limit,
                status,
                benefitPlanId,
                relationship,
                search,
            });
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async getMemberById(req, res, next) {
        try {
            const authReq = req;
            const hmoId = authReq.user.hmoId;
            const id = req.params.id;
            const member = await membersService.getMemberById(id, hmoId);
            if (!member) {
                res.status(404).json({ success: false, message: 'Member not found' });
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
            const authReq = req;
            const hmoId = authReq.user.hmoId;
            const id = req.params.id;
            const updated = await membersService.updateMember(id, hmoId, req.body);
            if (!updated) {
                res.status(404).json({ success: false, message: 'Member not found' });
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
            const authReq = req;
            const hmoId = authReq.user.hmoId;
            const id = req.params.id;
            const { status } = req.body;
            if (!status) {
                res.status(400).json({ success: false, message: 'Status is required' });
                return;
            }
            const updated = await membersService.updateMemberStatus(id, hmoId, status);
            if (!updated) {
                res.status(404).json({ success: false, message: 'Member not found' });
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
            const authReq = req;
            const hmoId = authReq.user.hmoId;
            const id = req.params.id;
            const dependents = await membersService.getDependents(id, hmoId);
            res.status(200).json({ success: true, data: dependents });
        }
        catch (error) {
            next(error);
        }
    }
}
export const membersController = new MembersController();
