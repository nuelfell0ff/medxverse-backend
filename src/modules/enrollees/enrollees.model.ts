import mongoose from 'mongoose';

import { BenefitDefinitionModel } from '../health-plans/health-plans.model.js';

// The existing HMS member schema uses the legacy `BenefitPlan` ref name for
// the enrollee's benefitPlanId field.  Keep that ref name for compatibility,
// but register it against the ACTUAL benefit-definition schema/collection.
// Do not register it against HealthPlan: a health plan and a benefit are
// separate entities in the HMO module.
const BENEFIT_PLAN_MODEL_NAME = 'BenefitPlan';

if (!mongoose.models[BENEFIT_PLAN_MODEL_NAME]) {
  mongoose.model(
    BENEFIT_PLAN_MODEL_NAME,
    BenefitDefinitionModel.schema,
    BenefitDefinitionModel.collection.name,
  );
}

export { MemberModel as EnrolleeModel } from '../members/members.model.js';
