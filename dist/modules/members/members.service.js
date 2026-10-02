import { enrolleesService, } from '../enrollees/enrollees.service.js';
/**
 * Compatibility facade for the legacy /members API.
 *
 * IMPORTANT:
 * Members and Enrollees intentionally share the same HMSMember persistence
 * record. The Enrollee Registry is the source of truth for creation,
 * validation, lifecycle, eligibility, cards and audit history.
 *
 * Do not put independent member-creation logic here. Doing so would bypass
 * enrollee lifecycle/card/audit behavior and would create two competing
 * enrollment paths.
 */
export class MembersService {
    enrolleeService;
    constructor(service = enrolleesService) {
        this.enrolleeService = service;
    }
    async createMember(hmoId, input, actorId) {
        return this.enrolleeService.createEnrollee(hmoId, input, actorId);
    }
    async getMembers(hmoId, filters) {
        const result = await this.enrolleeService.getEnrollees(hmoId, filters);
        return {
            members: result.enrollees,
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
        };
    }
    async getMemberById(id, hmoId) {
        return this.enrolleeService.getEnrolleeById(id, hmoId);
    }
    async updateMember(id, hmoId, input, actorId) {
        return this.enrolleeService.updateEnrollee(id, hmoId, input, actorId);
    }
    async updateMemberStatus(id, hmoId, status, reason, actorId) {
        return this.enrolleeService.updateEnrolleeStatus(id, hmoId, { status, reason }, actorId);
    }
    async getDependents(primaryMemberId, hmoId) {
        return this.enrolleeService.getDependents(primaryMemberId, hmoId);
    }
    async checkEligibility(id, hmoId, onDate) {
        return this.enrolleeService.checkEligibility(id, hmoId, onDate);
    }
    async renewMember(id, hmoId, input, actorId) {
        return this.enrolleeService.renewEnrollee(id, hmoId, input, actorId);
    }
    async getCard(id, hmoId, actorId) {
        return this.enrolleeService.getCard(id, hmoId, actorId);
    }
    async getLifecycle(id, hmoId) {
        return this.enrolleeService.getLifecycle(id, hmoId);
    }
}
export const membersService = new MembersService();
