# Enrollee coverage migration note

The enrollee/member coverage field is now `healthPlanId` and references `HealthPlan`.

The previous implementation stored `benefitPlanId` and pointed it at `BenefitDefinition`.
Those IDs cannot be blindly renamed because a benefit may belong to zero, one, or multiple
health plans.

Before deploying against an existing database, migrate existing `HMSMember` records by
mapping each legacy `benefitPlanId` to the intended `PlanBenefit.healthPlanId` for the same
HMO. If a legacy benefit maps to multiple plans, choose the correct plan from the enrollee's
business records rather than guessing.

New records should always use:
- primary member -> explicit active `healthPlanId`
- dependant -> inherited `healthPlanId` from the primary member

The source of truth for plan benefits remains `HealthPlan.benefitIds` plus the
`PlanBenefit` association/rule records.
