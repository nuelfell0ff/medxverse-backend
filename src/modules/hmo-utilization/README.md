# HMO Utilization & Fraud Management

Module 8 of the MedXVerse HMO Management System.

## Mount

```ts
import hmoUtilizationRoutes from './modules/hmo-utilization/hmo-utilization.routes.js';

v1Router.use('/hmo-utilization', hmoUtilizationRoutes);
```

## Endpoints

### Summary
- GET `/hmo-utilization/summary`

### Utilization events
- GET `/hmo-utilization/events`
- POST `/hmo-utilization/events`

### Fraud rules
- GET `/hmo-utilization/rules`
- POST `/hmo-utilization/rules`
- PATCH `/hmo-utilization/rules/:id`
- POST `/hmo-utilization/rules/run`

### Fraud alerts
- GET `/hmo-utilization/alerts`
- PATCH `/hmo-utilization/alerts/:id/review`

### Fraud cases
- GET `/hmo-utilization/cases`
- POST `/hmo-utilization/cases`
- PATCH `/hmo-utilization/cases/:id`

## Built-in detection categories

The rule runner currently implements:

- `HIGH_FREQUENCY_MEMBER`
- `HIGH_FREQUENCY_PROVIDER`
- `HIGH_VALUE_SERVICE`

Rules are tenant-isolated by `hmoId`.

## Important integration note

The service is intentionally standalone. For production integration, claims/pre-auth/billing services can call:

```ts
HMOUtilizationService.createUtilizationEvent(...)
```

after authoritative events occur. This avoids duplicating claims or billing records inside the utilization module.

The module can later be extended with:
- duplicate claim detection
- impossible date/service combinations
- provider/member collusion patterns
- diagnosis/procedure mismatch rules
- benefit-limit abuse
- prescription-frequency rules
- automated case creation
- scheduled rule execution


## Authentication / tenant-scope fix

All routes now use the shared MedXVerse `authenticate` middleware. The controller
resolves the HMO tenant from the authenticated user context (`hmoId`,
`organizationId`, `accountId`, `id`, `_id`, or `userId`) instead of trusting a
client-supplied tenant ID.

This fixes the previous `400 HMO context is required` responses from:
- GET `/hmo-utilization/summary`
- GET `/hmo-utilization/events`
- GET `/hmo-utilization/alerts`

The frontend should continue calling these endpoints normally with its Bearer
access token.
