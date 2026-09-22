/**
 * The Enrollee Registry is a domain-facing module over the existing HMSMember
 * collection. This keeps memberId references used by Claims and Pre-Auths
 * stable while exposing the HMO-facing /enrollees API.
 */
export { MemberModel as EnrolleeModel } from '../members/members.model.js';
