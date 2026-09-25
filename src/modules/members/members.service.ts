import {
  EnrolleesService,
  enrolleesService,
} from '../enrollees/enrollees.service.js';
import {
  CreateMemberInput,
  IMemberDocument,
  MemberQueryFilters,
  MemberStatus,
  PaginatedMembersResult,
  UpdateMemberInput,
} from './members.types.js';

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
  private readonly enrolleeService: EnrolleesService;

  public constructor(service: EnrolleesService = enrolleesService) {
    this.enrolleeService = service;
  }

  public async createMember(
    hmoId: string,
    input: CreateMemberInput,
    actorId?: string,
  ): Promise<IMemberDocument> {
    return this.enrolleeService.createEnrollee(
      hmoId,
      input,
      actorId,
    ) as Promise<IMemberDocument>;
  }

  public async getMembers(
    hmoId: string,
    filters: MemberQueryFilters,
  ): Promise<PaginatedMembersResult> {
    const result = await this.enrolleeService.getEnrollees(
      hmoId,
      filters,
    );

    return {
      members: result.enrollees as IMemberDocument[],
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  public async getMemberById(
    id: string,
    hmoId: string,
  ): Promise<IMemberDocument | null> {
    return this.enrolleeService.getEnrolleeById(
      id,
      hmoId,
    ) as Promise<IMemberDocument | null>;
  }

  public async updateMember(
    id: string,
    hmoId: string,
    input: UpdateMemberInput,
    actorId?: string,
  ): Promise<IMemberDocument | null> {
    return this.enrolleeService.updateEnrollee(
      id,
      hmoId,
      input,
      actorId,
    ) as Promise<IMemberDocument | null>;
  }

  public async updateMemberStatus(
    id: string,
    hmoId: string,
    status: MemberStatus,
    reason?: string,
    actorId?: string,
  ): Promise<IMemberDocument | null> {
    return this.enrolleeService.updateEnrolleeStatus(
      id,
      hmoId,
      { status, reason },
      actorId,
    ) as Promise<IMemberDocument | null>;
  }

  public async getDependents(
    primaryMemberId: string,
    hmoId: string,
  ): Promise<IMemberDocument[]> {
    return this.enrolleeService.getDependents(
      primaryMemberId,
      hmoId,
    ) as Promise<IMemberDocument[]>;
  }

  public async checkEligibility(
    id: string,
    hmoId: string,
    onDate?: Date,
  ) {
    return this.enrolleeService.checkEligibility(
      id,
      hmoId,
      onDate,
    );
  }

  public async renewMember(
    id: string,
    hmoId: string,
    input: { endDate: Date | string; reason?: string },
    actorId?: string,
  ): Promise<IMemberDocument | null> {
    return this.enrolleeService.renewEnrollee(
      id,
      hmoId,
      input,
      actorId,
    ) as Promise<IMemberDocument | null>;
  }

  public async getCard(
    id: string,
    hmoId: string,
    actorId?: string,
  ) {
    return this.enrolleeService.getCard(
      id,
      hmoId,
      actorId,
    );
  }

  public async getLifecycle(
    id: string,
    hmoId: string,
  ) {
    return this.enrolleeService.getLifecycle(id, hmoId);
  }
}

export const membersService = new MembersService();
