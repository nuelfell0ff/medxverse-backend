# MedXverse Unified EHR Integration

## What is now connected

The Patient module remains the canonical MPI/EHR authority. Clinical modules publish their durable clinical snapshots through `src/modules/patient/ehr.publisher.ts`.

| Module | Unified EHR resource | Publish points |
|---|---|---|
| Lab | `Observation` | Result entry and result amendment |
| Radiology | `DocumentReference` | Final signed report |
| Pharmacy | `MedicationStatement` | Dispense creation |
| Surgery | `DocumentReference` | Case creation and operative completion |
| Outpatient | `Encounter` | Encounter creation and consultation completion |
| Consultation | `Encounter` | Consultation creation and update |
| Ward/Admission | `Encounter` | Admission and discharge |
| Telemedicine | `Encounter` | Session creation and status/clinical-note updates |
| Billing | Existing billing/clinical-summary integration | Billing remains administrative/financial data rather than being forced into a clinical FHIR resource |
| Patient Portal | Patient EHR API | Portal can consume `GET /patients/:id/ehr` using the existing authenticated Patient endpoint |

## Important architecture rule

Do not make individual clinical modules write directly to `EhrEvent`, `PatientEhrView`, or the resource collections. They should publish through `publishEhrResource()` so versioning, audit, consent checks, and the materialized chart stay centralized.

## Migration

Patient MPI migration is explicit and should normally run once:

```bash
npm run migrate:patient
```

Do not run the migration automatically on every development startup.

## Normal development

```bash
npm run dev
```

## Existing records

The MPI migration assigns `universalPatientId` to Patient records. It does not replay historical Lab/Radiology/Pharmacy/etc. records into the EHR event stream. Existing records remain available through the legacy clinical summary while new/updated clinical events publish into the Unified EHR.

A dedicated historical EHR backfill should be run after the integration is deployed if the hospital needs the entire pre-existing clinical history represented in the event stream.

## Reliability note

Publishing is deliberately best-effort at the module boundary so a transient EHR projection error does not break an existing clinical transaction. The source module remains authoritative. For production-grade guaranteed delivery, the next hardening step is an outbox/retry worker that persists failed EHR publication attempts and replays them until acknowledged.

## FHIR scope

The EHR resources are FHIR R4-shaped and use the required resource types already defined by the Patient module. This integration does not claim full FHIR conformance or terminology validation. A future conformance layer can add strict FHIR validation and terminology bindings for SNOMED CT, ICD-10 and LOINC.

## Patient Portal

There is no standalone `patient-portal` backend module in the supplied backend. The Patient EHR endpoint is therefore the integration surface for a portal/mobile client. Portal authorization should be implemented so patients only receive resources permitted by the portal's consent/access policy.
