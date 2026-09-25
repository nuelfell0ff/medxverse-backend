import mongoose from 'mongoose';
import { BenefitDefinitionModel } from '../health-plans/health-plans.model.js';
import { MemberModel } from '../members/members.model.shared.js';

// The enrollee registry and legacy member API intentionally share one
// HMSMember persistence identity. Claims/pre-authorizations already reference
// HMSMember through memberId, so no second enrollee identity collection is
// created.
const BENEFIT_PLAN_MODEL_NAME = 'BenefitPlan';

if (!mongoose.models[BENEFIT_PLAN_MODEL_NAME]) {
  mongoose.model(
    BENEFIT_PLAN_MODEL_NAME,
    BenefitDefinitionModel.schema,
    BenefitDefinitionModel.collection.name,
  );
}

export const EnrolleeModel = MemberModel;
