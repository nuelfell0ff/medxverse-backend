# HMO Eligibility & Benefit Verification

This module verifies HMO coverage using the current architecture:

```text
Enrollee
  └── healthPlanId
        └── HealthPlan
              └── PlanBenefit
                    └── BenefitDefinition
```

The enrollee is attached to a **Health Plan**, not directly to an individual benefit. Eligibility resolves the enrollee's health plan first and then evaluates the benefit attached to that plan for the requested service category.

## Routes

- `POST /api/v1/eligibility/verify`
- `GET /api/v1/eligibility/stats`
- `GET /api/v1/eligibility/checks`
- `GET /api/v1/eligibility/checks/:id`
- `GET /api/v1/eligibility/member/:memberId`

## Registration

Mount `eligibility.routes.ts` at `/api/v1/eligibility` in the application's central HMO router.

The service uses the existing Enrollee, Claims, HMO Provider, Health Plan, Plan Benefit, and Benefit Definition collections. It does **not** populate `benefitPlanId`; that legacy field is no longer part of the enrollee coverage relationship.

## Important model-loading requirement

The HMO health-plan module must be loaded before the eligibility service is called so the `HealthPlan`, `PlanBenefit`, and `BenefitDefinition` Mongoose models are registered.
