
import mongoose from 'mongoose';

import { HealthPlanModel } from '../health-plans/health-plans.model.js';

const BENEFIT_PLAN_MODEL_NAME = 'BenefitPlan';

if (!mongoose.models[BENEFIT_PLAN_MODEL_NAME]) {
  mongoose.model(
    BENEFIT_PLAN_MODEL_NAME,
    HealthPlanModel.schema,
    HealthPlanModel.collection.name,
  );
}

export { MemberModel as EnrolleeModel } from '../members/members.model.js';
