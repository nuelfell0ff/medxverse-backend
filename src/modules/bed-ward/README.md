# Real-Time Smart Bed & Ward Management

Production-oriented bed capacity management for MedxVerse HIS.

## Core capabilities

- Strict bed state machine: `AVAILABLE → OCCUPIED → CLEANING → AVAILABLE`
- Out-of-service/blocked state with controlled transitions
- Optimistic locking using a per-bed `version`
- Atomic assignment to prevent double-booking
- Ranked bed matching by acuity, department and patient requirements
- Discharge/transfer release workflow that moves the source bed to `CLEANING`
- Housekeeping events for cleaning required/started/completed
- Ward and hospital occupancy dashboards
- Immutable `BedStatusEvent` audit trail
- Transfer requests with automatic destination suggestions
- Historical occupancy forecasting
- WebSocket snapshots for live ward/command-center dashboards
- Degraded-mode compatibility: clients can fall back to slow polling when WebSocket is unavailable

## API

All routes require authentication and are mounted under `/api/v1/bed-ward`.

- `GET /dashboard`
- `GET /wards`
- `POST /wards`
- `GET /beds`
- `POST /beds`
- `GET /beds/:id`
- `GET /beds/:id/history`
- `PATCH /beds/:id/status`
- `POST /beds/:id/cleaning/complete`
- `POST /beds/:id/assignment/release`
- `POST /matching/suggestions`
- `POST /assignments`
- `GET /transfers`
- `POST /transfers`
- `POST /transfers/:id/complete`
- `GET /forecasts`
- `POST /forecasts/generate`

WebSocket: `/ws/bed-ward?token=<access-token>`

## Integration

The module exposes an in-process event bus for hospital integrations:

- `board.changed`
- `housekeeping`

Emergency, theatre, ICU, admissions and discharge systems can publish admission/transfer intent into this module through the matching and assignment APIs, or subscribe to the events. For multi-instance deployments, replace the in-process emitter with Redis/pub-sub or a durable outbox while keeping the event contracts unchanged.

## Forecasting

Forecasts use the auditable bed-status event stream. The initial implementation uses a conservative 30-day historical moving-average/net-admission trend and is explicitly labeled in `methodology`. It does not pretend to be an ML model when insufficient historical data exists. This can later be replaced by a trained time-series model behind the same `OccupancyForecastService` interface.
