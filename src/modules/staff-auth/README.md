# Staff Authentication & Invitations

Hospital staff are not allowed to self-register.

A hospital administrator creates the staff record first. The administrator then sends an invitation from the staff page. The invite is bound to the existing staff record and hospital tenant.

Activation flow:

1. Admin creates Staff record.
2. Admin calls `POST /api/v1/auth/staff/invite/:staffId`.
3. MHMS generates a cryptographically random invitation token.
4. Only a SHA-256 hash of the token is stored.
5. The email contains the one-time activation URL.
6. Staff opens the URL and the frontend calls `GET /api/v1/auth/staff/invitation/:token`.
7. Staff chooses a password.
8. Frontend calls `POST /api/v1/auth/staff/invitation/accept`.
9. A `StaffUser` is created and linked to the Staff record.
10. A tenant-scoped JWT is issued.

Passwords are hashed with bcrypt and are never returned by the API.
