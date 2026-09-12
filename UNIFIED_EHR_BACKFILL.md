# MedxVerse Unified EHR historical backfill

The Unified EHR is append-only. Historical records are copied into FHIR R4-shaped EHR resources; the legacy departmental records are never deleted or rewritten.

## First run

1. Install dependencies.
2. Run the MPI migration once:

```bash
npm run migrate:patient
```

3. Preview the historical import without changing MongoDB:

```bash
npm run migrate:ehr -- --dry-run
```

4. Run the import:

```bash
npm run migrate:ehr
```

The importer is idempotent. Re-running it is safe because every migrated source record receives a stable `sourceKey` such as `LEGACY:LabOrder:<id>`.

## Useful controls

```bash
npm run migrate:ehr -- --module LabOrder
npm run migrate:ehr -- --patient <PATIENT_OBJECT_ID>
npm run migrate:ehr -- --from-date 2024-01-01 --to-date 2024-12-31
npm run migrate:ehr -- --limit 100
npm run migrate:ehr -- --dry-run --module RadiologyOrder
```

`--resume` is intentionally unnecessary: the migration resumes automatically from the idempotent source keys. It can still be supplied for compatibility with deployment scripts.

## Mapping

- LabOrder -> Observation
- RadiologyOrder -> DocumentReference
- DispenseRecord -> MedicationStatement
- Consultation -> Encounter + Condition + clinical-note DocumentReference
- Outpatient -> Encounter + clinical-note DocumentReference
- InpatientAdmission -> Encounter
- TelemedicineSession -> Encounter
- SurgeryCase / SurgicalCase -> Procedure
- EmergencyCase -> Encounter
- ICUAdmission -> Encounter
- DentalProcedure -> Procedure; DentalChart -> DocumentReference
- EyeExam -> Observation; OpticalPrescription -> DocumentReference
- MentalHealthAssessment -> sensitive Observation
- PsychotherapySession -> sensitive DocumentReference
- MchRecord -> Encounter
- TransfusionRequest -> Procedure
- DietaryOrder / MealDelivery -> Observation
- Appointment -> planned Encounter
- HmoClaim / HmoPreAuth -> Claim
- BillingAccount / Charge / Payment / Refund / PaymentPlan -> Claim-shaped financial record
- Ambulance / TripRequest -> DocumentReference

Unmapped models that do not have a clinical mapping are left untouched. The source database remains authoritative for those modules.

## Auditability

Every imported event records:

- `sourceSystem = LEGACY_MIGRATION`
- `sourceModel`
- `sourceRecordId`
- `sourceKey`
- original clinical `occurredAt`
- migration actor (source actor when available, otherwise the reserved system actor)

A generated `ehr-backfill-report.json` records scanned, imported, skipped, failed and unmatched counts per model.

## Production guidance

Run `--dry-run` first and take a MongoDB backup. MongoDB transactions are not required for the complete backfill because each source record is independently idempotent; a process interruption can be safely followed by another run.
