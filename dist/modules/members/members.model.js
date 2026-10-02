/**
 * Members and Enrollees intentionally use one persistence identity.
 *
 * Keep this export for legacy imports, but do not define a second Member
 * schema here. The canonical schema lives in the Enrollee Registry's
 * underlying HMSMember model.
 */
export { MemberModel } from './members.model.shared.js';
