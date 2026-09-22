# Enrollee Registry

HMO-facing enrollee registry API for MedXVerse.

## Persistence

This module intentionally reuses the existing `HMSMember` collection through
`MemberModel`. Claims and Pre-Authorizations already reference those records
using `memberId`, so creating a second enrollee collection would split the HMO
member identity and break downstream relationships.

## Routes

Mounted at `/api/v1/enrollees`:

- `GET /stats`
- `POST /`
- `GET /`
- `GET /:id`
- `PATCH /:id`
- `PATCH /:id/status`
- `GET /:id/dependents`
- `GET /:id/eligibility`

All routes require authentication and an HMO account.
