# HMO Provider Management

This module follows the existing MedXVerse HMO architecture used by Enrollees and Health Plans/Benefits:

- Express controllers/services/routes
- Mongoose models
- authenticate + authorize middleware
- HMO tenant resolved from trusted authentication context
- `{ success, data, message }` response shape
- paginated list + stats endpoints
- status/accreditation lifecycle endpoints

## Registration

Mount the default router at `/api/v1/providers` in the application's HMO route registration, alongside the existing `/enrollees`, `/health-plans`, and `/benefits` routes.

## Endpoints

- `GET /api/v1/providers/stats`
- `GET /api/v1/providers`
- `POST /api/v1/providers`
- `GET /api/v1/providers/:id`
- `PATCH /api/v1/providers/:id`
- `PATCH /api/v1/providers/:id/status`
- `PATCH /api/v1/providers/:id/accreditation`
- `GET /api/v1/providers/:id/performance`
