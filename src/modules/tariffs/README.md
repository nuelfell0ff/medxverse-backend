# HMO Tariffs Backend Module

This module provides the HMO "Tariffs & Plans" backend.

## Features

- HMO-scoped tariff records
- Unique tariff code per HMO
- Categories for consultation, laboratory, radiology, pharmacy, procedures, surgery, inpatient, outpatient, emergency, maternity, dental, optical and other services
- Draft / active / inactive / archived lifecycle
- Effective date ranges
- Base tariff amount and currency
- Provider-specific tariff overrides
- Pre-authorization requirement
- Search, filtering and pagination
- Statistics
- Tariff quotation endpoint that resolves provider-specific pricing
- HMO isolation on every operation

## Route

Mount the router at:

`/api/v1/hmo/tariffs`

or, if your existing HMO router is already mounted under `/api/v1/hmo`:

`router.use('/tariffs', tariffsRoutes)`

## Endpoints

GET `/`
GET `/stats`
GET `/:id`
POST `/`
PATCH `/:id`
PATCH `/:id/status`
POST `/quote`

## Important integration note

`hmoIdFromRequest()` resolves the HMO tenant only from trusted authenticated request context.

Supported authentication shapes include:

- `req.user.hmoId`
- `req.user.account.hmoId`
- `req.user.hmo._id` / `req.user.hmo.id`
- `req.user.organizationId`
- `req.account.hmoId`
- `req.account.accountId`
- `req.hmoId`
- `req.user.accountId`
- `req.account._id` / `req.account.id`
- `req.user.id` / `req.user._id`

No client-supplied query/body `hmoId` is used for tenant resolution, preserving HMO isolation.

The helper is intentionally compatible with the existing authentication pattern where the authenticated account itself may be the HMO tenant.

The module does not bypass authentication or authorization middleware. Mount it behind the same HMO authentication/permission middleware used by your other HMO modules.
