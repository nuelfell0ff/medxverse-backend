# MedXverse Emergency Department — Capacity Fix

This version fixes ED bay capacity so a bay configured for multiple patients remains available until all capacity slots are occupied.

## Capacity behavior

- `capacity` is the maximum number of concurrent active ED assignments a physical bay can hold.
- `occupiedCount` tracks the current number of active assignments.
- `availableCapacity = capacity - occupiedCount` is returned by `GET /api/v1/emergency/bays`.
- A bay configured with capacity `3` and one assigned patient returns `occupiedCount: 1`, `availableCapacity: 2`, and remains `AVAILABLE`.
- Once all 3 slots are occupied, the bay becomes `OCCUPIED` and is no longer selectable.
- Releasing/discharging a patient recalculates occupancy and makes the freed slot available again.
- Assignment reservation uses an atomic MongoDB conditional update to prevent two concurrent requests from consuming the same final slot.
- Existing bays created before capacity support may not have a persisted capacity value; they default to capacity `1`. Recreate or update those legacy bays with their intended capacity.

## Bay API

- `GET /api/v1/emergency/bays` — returns configured bays plus `capacity`, `occupiedCount`, `availableCapacity`, and derived status.
- `POST /api/v1/emergency/bays` — accepts `capacity`, `type`, `name`, `zone`, acuity levels, and resource capabilities.
- `POST /api/v1/emergency/visits/:id/bay` — assigns one patient into one available bay capacity slot.
- `PATCH /api/v1/emergency/visits/:id/bay/release` — releases the patient's slot and recalculates bay occupancy.

The rest of the Emergency Department workflow remains unchanged: arrival → triage → bay → treatment → results → disposition, with EHR publishing, downstream workflow events, WebSocket board updates, and audit history.
