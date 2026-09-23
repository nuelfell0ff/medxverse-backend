# HMO Billing, Premium & Payment Management

This module is the financial layer that follows Claims and consumes the existing HMO Tariff module.

## What it covers

- Member and corporate premium invoices.
- Invoice line calculation, discounts, tax, balances and invoice lifecycle.
- Provider settlements for fee-for-service.
- Provider capitation settlements.
- Payment recording and payment lifecycle.
- Automatic posting of successful premium payments to invoices.
- Automatic posting of successful provider payments to settlements.
- Payment reconciliation and variance detection.
- Tariff quotation through the existing `TariffModel`.
- HMO tenant isolation on every operation.
- Financial dashboard summary.

## Integration with the existing Tariff module

The module imports:

`../tariffs/tariffs.model.js`

and resolves active tariffs directly. It uses provider-specific tariff overrides where present.

The existing tariff module remains the source of truth for negotiated service pricing. Billing should not duplicate tariff records.

## Suggested mounting

If the HMO router is mounted at `/api/v1/hmo`:

```ts
router.use('/billing', billingRoutes);
```

The resulting endpoints are under:

`/api/v1/hmo/billing`

## Main endpoints

### Summary

- `GET /summary`

### Tariff quotation

- `POST /tariffs/quote`

Body:

```json
{
  "tariffId": "...",
  "providerId": "...",
  "quantity": 2,
  "date": "2026-09-23"
}
```

### Premium invoices

- `GET /invoices`
- `POST /invoices`
- `GET /invoices/:id`
- `PATCH /invoices/:id`
- `PATCH /invoices/:id/status`

### Provider settlements

- `GET /settlements`
- `POST /settlements`
- `POST /settlements/capitation`
- `GET /settlements/:id`
- `PATCH /settlements/:id/status`

### Payments

- `GET /payments`
- `POST /payments`
- `GET /payments/:id`
- `PATCH /payments/:id/status`

A successful premium payment updates its invoice balance/status. A successful provider-settlement payment updates the settlement paid/balance amounts and status.

### Reconciliation

- `POST /reconciliation`

## Important claims integration note

The settlement schema accepts `claimId` references and stores approved/adjusted/payable amounts as a financial snapshot. This keeps provider settlement history auditable even if a claim is later changed.

A higher-level claims workflow can create settlements from approved claims by collecting those claim snapshots and sending them to `POST /settlements`.

## Tenant isolation

The HMO ID is resolved from trusted authentication context only. The client does not supply an HMO ID for tenant selection.

Mount this router behind the same authentication and authorization middleware used by the other HMO modules.
