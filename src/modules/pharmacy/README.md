# Integrated Pharmacy Management — MedXverse

## Architecture

Electronic prescription intake → clinical screening → pharmacist approval → barcode verification → atomic inventory decrement → dispense record → controlled-substance audit → Unified EHR/eMAR linkage → Billing.

## Entities

- Prescription
- DispenseRecord
- InventoryItem
- InventoryTransaction
- FormularyEntry
- ControlledSubstanceLog

## Routes

Mounted under `/api/v1/pharmacy`:

### Inventory
- `POST /inventory`
- `GET /inventory`
- `GET /inventory/:id`
- `PATCH /inventory/:id/stock`
- `GET /inventory/:id/ledger`

### Prescriptions
- `POST /prescriptions`
- `GET /prescriptions`
- `GET /prescriptions/:id`
- `POST /prescriptions/:id/screen`
- `POST /prescriptions/:id/approve`

### Dispensing
- `POST /dispense`
- `GET /dispense`

### Formulary
- `POST /formulary`
- `GET /formulary`

## Realtime

WebSocket endpoint:

`/ws/pharmacy?token=<access-token>`

Events include prescription receipt, screening completion, dispensing, stock changes, low-stock alerts, and controlled-substance logging.

## Safety

- Inventory decrement uses an atomic conditional update requiring sufficient stock.
- Expired items cannot be dispensed.
- Barcode must match the prescription when a prescription barcode is present and must match the selected inventory item when an inventory barcode exists.
- Controlled substances require a second verifier and the verifier must differ from the dispensing pharmacist.
- Controlled-substance logs are append-only at the application layer and include a SHA-256 integrity hash.
- Pharmacy billing and EHR publication are downstream of the dispense record so temporary downstream failures do not erase the clinical dispensing record.

## Clinical screening

The built-in screening service records allergy/formulary/duplicate-therapy findings and exposes a clean integration seam for a licensed drug-interaction source or AI clinical decision-support service. The lightweight fallback is not a substitute for a validated clinical interaction database.

## Important deployment note

Mount the router from `src/routes/index.ts`:

```ts
router.use('/pharmacy', pharmacyRoutes);
```

Attach the WebSocket once from `src/server.ts`:

```ts
attachPharmacyWebSocket(server);
```

Do not attach it from the router.

## Migration

No automatic migration of old Pharmacy records is included. Existing legacy records can remain untouched while all new electronic prescriptions and new dispenses use the integrated architecture.


## Transaction requirement

Dispensing uses a MongoDB session transaction spanning the stock decrement,
inventory ledger entry, dispense record, controlled-substance log, and
prescription status transition. Production MongoDB must therefore run as a
replica set or sharded cluster with transactions enabled. If the deployment
cannot support MongoDB transactions, do not enable production dispensing
until the database topology is corrected.
