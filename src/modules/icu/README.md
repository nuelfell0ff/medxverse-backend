# MedXVerse ICU Management Module

The ICU module is a critical-care clinical module for high-frequency bedside data,
device integration, trend review, scoring, nursing flowsheets and family
communication.

## Architecture

```text
Bedside monitor / ventilator / infusion pump
                    |
                    v
          Device Gateway Boundary
       HL7 / IEEE 11073 / Vendor API
                    |
                    v
           Normalized DeviceReading
                    |
          +---------+---------+
          |                   |
          v                   v
   Nursing Flowsheet       ICU Scoring
    (pending review)       SOFA / APACHE II
          |                   |
          +---------+---------+
                    |
                    v
             ICU Dashboard
```

The domain layer does not contain vendor-specific device logic. Protocol/vendor
connectors normalize their payload into the common `DeviceReading` shape.

## Files

- `icu.model.ts` — ICU admission, time-series device readings, flowsheet,
  score and family communication persistence.
- `icu.types.ts` — domain types and DTOs.
- `icu.service.ts` — ICU workflows and hospital-boundary validation.
- `icu.controller.ts` — HTTP controllers.
- `icu.routes.ts` — authenticated API routes.
- `icu.device-adapters.ts` — protocol adapter contract plus structured and
  basic HL7 OBX normalization.
- `icu.device-gateway.service.ts` — vendor-neutral ingestion, idempotency and
  automatic flowsheet population.
- `icu.scoring.service.ts` — versioned SOFA/APACHE II calculations and
  underlying-data collection.
- `icu.scoring.job.ts` — scheduler hook for periodic score recalculation.

## Data-loss and latency considerations

`DeviceReading` is configured as a MongoDB time-series collection using
`recordedAt` as the time field and `metadata` as the series metadata. The
gateway also records the original source sequence when supplied, allowing
retries to be detected.

For production deployment, the device gateway should run redundantly and
buffer outbound readings at the edge during temporary network interruptions.
A queue/broker can be placed between the gateway and the API when the hospital
deployment requires stronger delivery guarantees.

## Scoring

SOFA and APACHE II are stored with:
- score value
- complete/partial status
- individual components
- source/input snapshot
- calculation version
- calculation timestamp

Missing inputs are not silently replaced with normal values. APACHE II requires
the chronic-health component to be explicitly documented before the score is
marked complete.

The `recalculate-from-data` endpoint derives available inputs from the latest
ICU device/flowsheet data and released laboratory results. It should be invoked
by the application's scheduler at the desired cadence.

## API routes

Assuming the application mounts this router at `/icu`:

Canonical admission-oriented routes used by the frontend:

- `POST /icu/admissions`
- `GET /icu/admissions`
- `GET /icu/admissions/:id`
- `GET /icu/admissions/:id/dashboard`
- `PATCH /icu/admissions/:id/vitals`
- `PATCH /icu/admissions/:id/ventilator`
- `PATCH /icu/admissions/:id/status`
- `POST /icu/admissions/:id/device-readings`
- `GET /icu/admissions/:id/device-readings`
- `GET /icu/admissions/:id/trends?parameter=heartRateBpm`
- `GET /icu/admissions/:id/flowsheet`
- `POST /icu/admissions/:id/flowsheet`
- `PATCH /icu/admissions/:id/flowsheet/:entryId/confirm`
- `POST /icu/admissions/:id/scores/recalculate`
- `POST /icu/admissions/:id/scores/recalculate-from-data`
- `GET /icu/admissions/:id/scores`
- `POST /icu/admissions/:id/family-communications`
- `GET /icu/admissions/:id/family-communications`

The original root-based routes (`/icu`, `/icu/:id`, etc.) are also retained as
backwards-compatible aliases. All routes use the existing `authenticate`
middleware.

## Surgery integration

`ICUAdmission.sourceSurgeryCaseId` links a postoperative ICU admission to the
existing `SurgeryCase` model. This preserves the relationship:

Surgery -> recovery/PACU -> ICU -> ward/discharge

without merging the Surgery and ICU modules into one domain.

## Important production boundary

Actual bedside-device certification, electrical/network isolation, vendor
protocol certification, alarm safety, clinical validation, and hospital
governance are deployment responsibilities. The included adapters provide the
software boundary; they are not a substitute for vendor-certified medical
device integration.
