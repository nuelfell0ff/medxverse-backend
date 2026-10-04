# MHMS Communication Centre — Backend Foundation

This module provides the backend foundation for the hospital communication centre.

## Tenant isolation

Every communication resource is scoped by `hospitalId`, where `hospitalId` is the existing MHMS `Account._id` for an account whose `accountType` is `HOSPITAL`.

A staff JWT contains:

- `userType: STAFF`
- `id`: StaffUser `_id`
- `accountId`: hospital Account `_id`
- `hospitalId`: hospital Account `_id`
- `role`: staff role

Communication controllers never accept a hospital/tenant ID from the request body for authorization. The tenant is derived from the authenticated token and every service query includes that tenant.

## Main resources

- `Conversation`: DIRECT, GROUP, DEPARTMENT, PATIENT_CARE, SUPPORT
- `Message`: text/file/image/system messages with read receipts
- `Department`: hospital-scoped department/channel registry
- `CommunicationTicket`: support/escalation workflow with assignment, priority and status

## REST API

Base: `/api/v1/communication`

- `GET /inbox`
- `GET /my-patients`
- `GET /staff/search?q=`
- `GET /messages/search?q=`
- `POST /conversations/direct`
- `POST /conversations/group`
- `POST /conversations/patient`
- `POST /conversations/department`
- `POST /conversations/:id/join`
- `GET /conversations/:id`
- `GET /conversations/:id/messages`
- `POST /conversations/:id/messages`
- `POST /conversations/:id/read`
- `GET /departments`
- `POST /departments`
- `GET /tickets`
- `POST /tickets`
- `PATCH /tickets/:id`
- `PATCH /presence`

## Real-time

Staff clients connect to `/ws/communication?token=<access-token>`.

The socket authenticates the staff JWT, verifies that the StaffUser is active, and only emits events for the same hospital and intended recipient user IDs.

## Staff invitations

Canonical routes are under `/api/v1/auth/staff`:

- `POST /invite/:staffId` — hospital administrator creates/re-sends an invitation
- `GET /invitation/:token` — public invitation validation
- `POST /invitation/accept` — create/activate the staff login and issue an access token
- `POST /login` — staff login; `hospitalCode` is required when an email exists in more than one hospital

Invitation tokens are random, single-use, hashed in MongoDB, time-limited, and never stored in plaintext.

Email delivery uses the Resend HTTPS API when `RESEND_API_KEY` and `EMAIL_FROM` are configured. In development without a provider, the API returns a development-only invitation URL so the flow can still be tested.
