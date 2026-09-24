import type { NextFunction, Request, Response } from 'express';
import { hmoPortalsService } from './hmo-portals.service.js';

const send = (res: Response, data: unknown, status = 200) => res.status(status).json({ success: true, data });
const fail = (next: NextFunction, error: unknown) => next(error);

const user = (req: Request): any => (req as any).user || {};
const hmoId = (req: Request): string => String(user(req).hmoId || user(req).hmoID || user(req).organizationId || user(req).accountId || user(req).id || user(req)._id || '');
const actorId = (req: Request): string => String(user(req).userId || user(req).id || user(req)._id || '');
const queryRole = (req: Request) => String(user(req).portalRole || user(req).role || '').toUpperCase();

export class HmoPortalsController {
  static async memberProfile(req: Request, res: Response, next: NextFunction) { try { const id = String(req.params.memberId || actorId(req)); const data = await hmoPortalsService.getMemberProfile(hmoId(req), id); if (!data) return res.status(404).json({ success: false, message: 'Member not found' }); return send(res, data); } catch (e) { fail(next, e); } }
  static async updateMemberProfile(req: Request, res: Response, next: NextFunction) { try { const id = String(req.params.memberId || actorId(req)); return send(res, await hmoPortalsService.upsertMemberProfile(hmoId(req), id, { ...req.body, memberId: id })); } catch (e) { fail(next, e); } }
  static async memberDashboard(req: Request, res: Response, next: NextFunction) { try { const id = String(req.params.memberId || actorId(req)); const data = await hmoPortalsService.getMemberDashboard(hmoId(req), id); if (!data) return res.status(404).json({ success: false, message: 'Member not found' }); return send(res, data); } catch (e) { fail(next, e); } }
  static async memberBenefits(req: Request, res: Response, next: NextFunction) { try { const id = String(req.params.memberId || actorId(req)); return send(res, await hmoPortalsService.getMemberBenefits(hmoId(req), id)); } catch (e) { fail(next, e); } }
  static async memberProviders(req: Request, res: Response, next: NextFunction) { try { return send(res, await hmoPortalsService.listMemberProviders(hmoId(req), req.query)); } catch (e) { fail(next, e); } }
  static async memberRecords(req: Request, res: Response, next: NextFunction) { try { const id = String(req.params.memberId || actorId(req)); const type = req.params.type as 'claims' | 'preAuths' | 'invoices' | 'utilization'; if (!['claims', 'preAuths', 'invoices', 'utilization'].includes(type)) return res.status(400).json({ success: false, message: 'Invalid record type' }); return send(res, await hmoPortalsService.listMemberRecords(hmoId(req), id, type)); } catch (e) { fail(next, e); } }
  static async memberNotifications(req: Request, res: Response, next: NextFunction) { try { const id = String(req.params.memberId || actorId(req)); return send(res, await hmoPortalsService.listMemberNotifications(hmoId(req), id)); } catch (e) { fail(next, e); } }
  static async markNotificationRead(req: Request, res: Response, next: NextFunction) { try { const id = String(req.params.memberId || actorId(req)); const data = await hmoPortalsService.markNotificationRead(hmoId(req), id, String(req.params.notificationId)); if (!data) return res.status(404).json({ success: false, message: 'Notification not found' }); return send(res, data); } catch (e) { fail(next, e); } }

  static async providerProfile(req: Request, res: Response, next: NextFunction) { try { const id = String(req.params.providerId || actorId(req)); const data = await hmoPortalsService.getProviderProfile(hmoId(req), id); if (!data) return res.status(404).json({ success: false, message: 'Provider not found' }); return send(res, data); } catch (e) { fail(next, e); } }
  static async updateProviderProfile(req: Request, res: Response, next: NextFunction) { try { const id = String(req.params.providerId || actorId(req)); return send(res, await hmoPortalsService.upsertProviderProfile(hmoId(req), id, { ...req.body, providerId: id })); } catch (e) { fail(next, e); } }
  static async providerDashboard(req: Request, res: Response, next: NextFunction) { try { const id = String(req.params.providerId || actorId(req)); const data = await hmoPortalsService.getProviderDashboard(hmoId(req), id); if (!data) return res.status(404).json({ success: false, message: 'Provider not found' }); return send(res, data); } catch (e) { fail(next, e); } }
  static async providerMembers(req: Request, res: Response, next: NextFunction) { try { return send(res, await hmoPortalsService.searchProviderMembers(hmoId(req), req.query)); } catch (e) { fail(next, e); } }
  static async providerEligibility(req: Request, res: Response, next: NextFunction) { try { return send(res, await hmoPortalsService.providerMemberEligibility(hmoId(req), String(req.params.providerId || actorId(req)), String(req.params.memberId))); } catch (e) { fail(next, e); } }
  static async providerClaims(req: Request, res: Response, next: NextFunction) { try { return send(res, await hmoPortalsService.providerClaims(hmoId(req), String(req.params.providerId || actorId(req)), req.query)); } catch (e) { fail(next, e); } }
  static async providerAuthorizations(req: Request, res: Response, next: NextFunction) { try { return send(res, await hmoPortalsService.providerAuthorizations(hmoId(req), String(req.params.providerId || actorId(req)), req.query)); } catch (e) { fail(next, e); } }
  static async providerSettlements(req: Request, res: Response, next: NextFunction) { try { return send(res, await hmoPortalsService.providerSettlements(hmoId(req), String(req.params.providerId || actorId(req)), req.query)); } catch (e) { fail(next, e); } }
  static async createProviderAuthorization(req: Request, res: Response, next: NextFunction) { try { return send(res, await hmoPortalsService.createProviderAuthorization(hmoId(req), String(req.params.providerId || actorId(req)), req.body), 201); } catch (e) { fail(next, e); } }
  static async createProviderClaim(req: Request, res: Response, next: NextFunction) { try { return send(res, await hmoPortalsService.createProviderClaim(hmoId(req), String(req.params.providerId || actorId(req)), req.body), 201); } catch (e) { fail(next, e); } }
}

export { hmoId, actorId, queryRole };
