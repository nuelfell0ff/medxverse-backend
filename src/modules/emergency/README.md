# MedXverse Emergency Department Management

This module replaces the legacy `EmergencyCase` implementation with a structured ED workflow.

## Core entities

- `EDVisit`
- `TriageAssessment`
- `EDBay`
- `BayAssignment`
- `EDOrder`
- `DispositionRecord`

## Main API

Base path: `/api/v1/emergency`

- `GET /board` — real-time-board snapshot, prioritized by acuity + wait time
- `GET /visits` — paginated ED visits
- `POST /visits` — register an ED arrival
- `GET /visits/:id` — complete ED visit workspace
- `POST /visits/:id/triage` — create initial triage or reassessment
- `GET /bays` — configured ED bays
- `POST /bays` — configure an ED bay
- `POST /visits/:id/bay` — assign best matching or requested bay
- `PATCH /visits/:id/bay/release` — release active bay
- `PATCH /visits/:id/status` — controlled status transition
- `POST /visits/:id/orders` — place ED lab/imaging/medication/other order
- `PATCH /orders/:orderId` — update order/result status
- `POST /visits/:id/disposition` — admit/discharge/transfer/death/LWBS/LAMA
- `GET /visits/:id/status-history` — append-only status transition history

## Real-time board

The backend exposes a WebSocket channel at:

`/ws/emergency?token=<access-token>`

The server sends:

- `connected`
- `board.snapshot`
- `board.changed` when a refresh cannot be generated immediately

The WebSocket is attached in `src/server.ts`.

## Integrations

- Unified EHR: ED encounters and triage observations are published through the existing `publishEhrResource` bridge.
- Bed Management: admission disposition emits `downstream.workflow` with `BED_MANAGEMENT`.
- Discharge Planning: discharge disposition emits `DISCHARGE_PLANNING`.
- Referral/Transfer: transfer disposition emits `REFERRAL`.
- Laboratory/Radiology/Pharmacy: ED orders carry `type`, `sourceSystem`, and `sourceRecordId` so downstream modules can reconcile results.

## Important implementation notes

- Patient status transitions are recorded in `EDVisit.statusTransitions`; prior entries are never removed by the service.
- Triage assessments and bay assignments are historical records rather than silent overwrites.
- Board priority is `acuity weight + elapsed wait minutes`, so a lower-acuity patient gains priority as wait time increases.
- Board responses include `boardVersion` and `serverTime`, allowing the frontend to maintain a local cached snapshot during temporary connectivity loss.
- The in-process event bus is suitable for the current single-server deployment. For multi-instance production deployment, mirror `emergencyEvents` through Redis/pub-sub or a durable outbox so WebSocket clients on every instance receive the same events.
- The module intentionally does not directly create inpatient admission/discharge/referral records because those downstream modules should remain the authoritative owners of those workflows. The disposition event is the integration boundary.
