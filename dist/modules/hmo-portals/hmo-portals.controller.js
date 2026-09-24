import { hmoPortalsService } from './hmo-portals.service.js';
const send = (res, data, status = 200) => res.status(status).json({ success: true, data });
const fail = (next, error) => next(error);
const user = (req) => req.user || {};
const hmoId = (req) => String(user(req).hmoId || user(req).hmoID || user(req).organizationId || user(req).accountId || user(req).id || user(req)._id || '');
const actorId = (req) => String(user(req).userId || user(req).id || user(req)._id || '');
const queryRole = (req) => String(user(req).portalRole || user(req).role || '').toUpperCase();
export class HmoPortalsController {
    static async memberProfile(req, res, next) { try {
        const id = String(req.params.memberId || actorId(req));
        const data = await hmoPortalsService.getMemberProfile(hmoId(req), id);
        if (!data)
            return res.status(404).json({ success: false, message: 'Member not found' });
        return send(res, data);
    }
    catch (e) {
        fail(next, e);
    } }
    static async updateMemberProfile(req, res, next) { try {
        const id = String(req.params.memberId || actorId(req));
        return send(res, await hmoPortalsService.upsertMemberProfile(hmoId(req), id, { ...req.body, memberId: id }));
    }
    catch (e) {
        fail(next, e);
    } }
    static async memberDashboard(req, res, next) { try {
        const id = String(req.params.memberId || actorId(req));
        const data = await hmoPortalsService.getMemberDashboard(hmoId(req), id);
        if (!data)
            return res.status(404).json({ success: false, message: 'Member not found' });
        return send(res, data);
    }
    catch (e) {
        fail(next, e);
    } }
    static async memberBenefits(req, res, next) { try {
        const id = String(req.params.memberId || actorId(req));
        return send(res, await hmoPortalsService.getMemberBenefits(hmoId(req), id));
    }
    catch (e) {
        fail(next, e);
    } }
    static async memberProviders(req, res, next) { try {
        return send(res, await hmoPortalsService.listMemberProviders(hmoId(req), req.query));
    }
    catch (e) {
        fail(next, e);
    } }
    static async memberRecords(req, res, next) { try {
        const id = String(req.params.memberId || actorId(req));
        const type = req.params.type;
        if (!['claims', 'preAuths', 'invoices', 'utilization'].includes(type))
            return res.status(400).json({ success: false, message: 'Invalid record type' });
        return send(res, await hmoPortalsService.listMemberRecords(hmoId(req), id, type));
    }
    catch (e) {
        fail(next, e);
    } }
    static async memberNotifications(req, res, next) { try {
        const id = String(req.params.memberId || actorId(req));
        return send(res, await hmoPortalsService.listMemberNotifications(hmoId(req), id));
    }
    catch (e) {
        fail(next, e);
    } }
    static async markNotificationRead(req, res, next) { try {
        const id = String(req.params.memberId || actorId(req));
        const data = await hmoPortalsService.markNotificationRead(hmoId(req), id, String(req.params.notificationId));
        if (!data)
            return res.status(404).json({ success: false, message: 'Notification not found' });
        return send(res, data);
    }
    catch (e) {
        fail(next, e);
    } }
    static async providerProfile(req, res, next) { try {
        const id = String(req.params.providerId || actorId(req));
        const data = await hmoPortalsService.getProviderProfile(hmoId(req), id);
        if (!data)
            return res.status(404).json({ success: false, message: 'Provider not found' });
        return send(res, data);
    }
    catch (e) {
        fail(next, e);
    } }
    static async updateProviderProfile(req, res, next) { try {
        const id = String(req.params.providerId || actorId(req));
        return send(res, await hmoPortalsService.upsertProviderProfile(hmoId(req), id, { ...req.body, providerId: id }));
    }
    catch (e) {
        fail(next, e);
    } }
    static async providerDashboard(req, res, next) { try {
        const id = String(req.params.providerId || actorId(req));
        const data = await hmoPortalsService.getProviderDashboard(hmoId(req), id);
        if (!data)
            return res.status(404).json({ success: false, message: 'Provider not found' });
        return send(res, data);
    }
    catch (e) {
        fail(next, e);
    } }
    static async providerMembers(req, res, next) { try {
        return send(res, await hmoPortalsService.searchProviderMembers(hmoId(req), req.query));
    }
    catch (e) {
        fail(next, e);
    } }
    static async providerEligibility(req, res, next) { try {
        return send(res, await hmoPortalsService.providerMemberEligibility(hmoId(req), String(req.params.providerId || actorId(req)), String(req.params.memberId)));
    }
    catch (e) {
        fail(next, e);
    } }
    static async providerClaims(req, res, next) { try {
        return send(res, await hmoPortalsService.providerClaims(hmoId(req), String(req.params.providerId || actorId(req)), req.query));
    }
    catch (e) {
        fail(next, e);
    } }
    static async providerAuthorizations(req, res, next) { try {
        return send(res, await hmoPortalsService.providerAuthorizations(hmoId(req), String(req.params.providerId || actorId(req)), req.query));
    }
    catch (e) {
        fail(next, e);
    } }
    static async providerSettlements(req, res, next) { try {
        return send(res, await hmoPortalsService.providerSettlements(hmoId(req), String(req.params.providerId || actorId(req)), req.query));
    }
    catch (e) {
        fail(next, e);
    } }
    static async createProviderAuthorization(req, res, next) { try {
        return send(res, await hmoPortalsService.createProviderAuthorization(hmoId(req), String(req.params.providerId || actorId(req)), req.body), 201);
    }
    catch (e) {
        fail(next, e);
    } }
    static async createProviderClaim(req, res, next) { try {
        return send(res, await hmoPortalsService.createProviderClaim(hmoId(req), String(req.params.providerId || actorId(req)), req.body), 201);
    }
    catch (e) {
        fail(next, e);
    } }
}
export { hmoId, actorId, queryRole };
