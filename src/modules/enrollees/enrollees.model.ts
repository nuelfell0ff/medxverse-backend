import { MemberModel } from '../members/members.model.shared.js';

// The enrollee registry and legacy member API intentionally share one
// HMSMember persistence identity. Claims/pre-authorizations already reference
// HMSMember through memberId, so no second enrollee identity collection is
// created.
//
// Coverage is represented by healthPlanId on HMSMember. The selected HealthPlan
// owns the benefits available to the enrollee.
export const EnrolleeModel = MemberModel;
