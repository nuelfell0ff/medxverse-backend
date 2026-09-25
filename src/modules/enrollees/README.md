# Enrollee Registry

HMO-facing enrollee registry API for MedXVerse.

## Persistence

The registry intentionally reuses the existing HMSMember persistence model. Claims and pre-authorizations already reference these records using `memberId`, so the registry does not create a second member identity collection.

Two small HMO-owned collections are used for membership lifecycle data that should not be forced into the legacy HMS member schema:

- `EnrolleeLifecycle` — enrollment, status, renewal, plan-change, and audit history.
- `EnrolleeCard` — digital HMO card issuance/status/validity.

## Routes

Mounted at `/api/v1/enrollees`:

- `GET /stats`
- `POST /`
- `GET /`
- `GET /:id`
- `PATCH /:id`
- `PATCH /:id/status` — status changes require reasons for suspension/termination.
- `POST /:id/renew` — extend coverage and reactivate eligible non-terminated members.
- `GET /:id/dependents`
- `GET /:id/eligibility`
- `GET /:id/card` — obtain/create the active digital HMO card.
- `GET /:id/history` — membership lifecycle history.

All routes require authentication and an HMO account.

## Important scope note

Health-plan assignment is validated at the enrollee level. Full service-level benefit verification (covered service, exclusion, remaining limit, co-pay/deductible) belongs to the Benefits/Eligibility domain and should consume this enrollee identity rather than duplicating it.

## Architecture clarification

The `HMSMember` document is the single persisted enrollee/member identity. The
Enrollee Registry is the canonical service for enrollment and membership
lifecycle. The legacy `/members` module is now a compatibility facade over that
service rather than a second implementation.

This means member creation through `/members` and enrollee creation through
`/enrollees` use the same validation, lifecycle history and digital-card flow.
Claims and pre-authorizations can continue using `memberId` without creating a
second member identity collection.

The intended HMO workflow is:

1. HMO staff create/enroll the member through the Members/Enrollee workflow.
2. The member is assigned a policy number, health plan and coverage dates.
3. Primary/dependent relationships are validated by the Enrollee Registry.
4. Enrollment lifecycle history is recorded.
5. An active digital HMO card is issued for active members.
6. Provider-facing workflows consume the existing member identity for search,
   eligibility, claims and pre-authorizations.

The provider portal therefore should not own member creation unless a separate
business rule explicitly grants providers that permission.


## Health plan assignment

An enrollee is assigned to a **HealthPlan**, not an individual BenefitDefinition.
The selected health plan owns the benefits available to the enrollee.

- Primary members must have an active health plan with at least one attached benefit.
- Dependants inherit the primary member's health plan and cannot select a different plan.
- If a primary member changes health plan, the registry synchronizes that plan to the primary member's dependants.
- Benefit definitions and plan-specific benefit rules remain owned by the Health Plans & Benefits domain; the enrollee record stores only `healthPlanId`.
