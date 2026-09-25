# MedXVerse HMO Analytics, Reporting, Security & Compliance Backend

This module is the final HMO intelligence module. It is intentionally separate from `/hmo` (the existing HMO Hub) and from the existing Settings page.

## Backend responsibilities

- Executive and operational analytics
- Claims analytics using the existing `ClaimModel`
- Health-plan analytics using the existing `HealthPlanModel`
- Optional analytics for enrollee/provider/pre-authorization/billing models when those models are registered
- Report generation in JSON or CSV
- Report history
- Immutable-style audit event storage
- Consent/privacy records
- Compliance report generation and lifecycle
- HMO tenant isolation through `hmoId`

## Routes

Mount under `/api/v1/hmo-analytics` after the project's existing HMO authentication middleware.

- `GET /summary`
- `POST /reports`
- `GET /reports`
- `GET /reports/:id`
- `GET /audit`
- `GET /consents`
- `POST /consents`
- `PATCH /consents/:id/revoke`
- `POST /compliance/reports`
- `GET /compliance/reports`
- `PATCH /compliance/reports/:id/status`

## Important integration note

The existing project already uses HMO tenant scoping by `hmoId`. This module follows the same rule. Every persistent analytics/audit/consent/compliance document is scoped by `hmoId`.

The claims and health-plan imports assume the existing module locations:

- `../claims/claims.model.js`
- `../health-plans/health-plans.model.js`

If the actual health-plan folder is named differently in the backend, change only that import path.

Optional collections are discovered from already-registered Mongoose models so the analytics module does not duplicate enrollee/provider/billing/pre-authorization schemas.
