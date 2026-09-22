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

Benefit-plan assignment is validated at the enrollee level. Full service-level benefit verification (covered service, exclusion, remaining limit, co-pay/deductible) belongs to the Benefits/Eligibility domain and should consume this enrollee identity rather than duplicating it.
