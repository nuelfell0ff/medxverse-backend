# Health Plans & Benefits

This module implements the HMO health-plan and benefit-management domain.

## API mounting

Mount `health-plans.routes.ts` at `/health-plans` and `benefits.routes.ts` at `/benefits`.

The module provides:
- HMO-tenant-isolated health plans and benefit definitions.
- Plan lifecycle: DRAFT -> ACTIVE/INACTIVE/ARCHIVED, with controlled transitions.
- Benefit definitions with covered services, limits, exclusions, waiting periods, co-pay, deductible and pre-authorization rules.
- Explicit plan-benefit associations with per-plan rule overrides.
- Pagination, search and filters.
- Plan and benefit statistics.
- Eligibility-ready benefit calculation with annual amount/visit limits, waiting periods and cost-share estimates.
- HMO ownership checks on every plan, benefit and association operation.
