# Integration patch

## src/routes/index.ts

Add:

```ts
import pharmacyRoutes from '../modules/pharmacy/pharmacy.routes.js';
router.use('/pharmacy', pharmacyRoutes);
```

Keep only one `/pharmacy` mount.

## src/server.ts

Add:

```ts
import { attachPharmacyWebSocket } from './modules/pharmacy/pharmacy.socket.js';
```

After the HTTP server is created:

```ts
attachPharmacyWebSocket(server);
```

Attach only once.

## CPOE / EHR → Pharmacy

Call `PharmacyService.createPrescription()` from the CPOE/EHR event adapter.
Use `source`, `sourceSystem`, and `sourceRecordId` to preserve provenance and
make source-record ingestion idempotent.

## eMAR

Pass the eMAR medication/order reference as `emarReferenceId` when dispensing.
The dispense record remains the authoritative record of what was physically
dispensed.

## Billing

Connect your existing centralized Billing service after a successful dispense
transaction. Billing failure must not roll back the clinical dispense.

## Unified EHR

The service publishes a MedicationStatement through the existing
`publishEhrResource()` bridge after the dispense transaction commits.

## AI / clinical decision support

Use `pharmacy.integration.ts` as the adapter seam. AI output is advisory;
pharmacist authorization remains authoritative.

## MongoDB

Production dispensing requires a transaction-capable MongoDB deployment
(replica set or sharded cluster).
