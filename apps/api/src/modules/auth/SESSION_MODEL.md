# Authentication session model

The API uses **stateful server-side sessions backed by the `Session` table** while still issuing JWT access tokens.

## How it works

1. On login/register, the API creates a random session id (`sid`) and includes it in the JWT payload, then sets that JWT in the HttpOnly `access` cookie for browser clients.
2. The same `sid` is persisted in the `Session.token` field with metadata (`userId`, IP, user-agent, expiry).
3. Every authenticated request validates both:
   - JWT signature/expiry, and
   - session state in the database (must exist, not revoked, and not expired).
4. Logout revokes the active session by setting `revokedAt` and clears the `access` cookie.

This guarantees revoked sessions are rejected immediately, even if the JWT itself has not yet expired.

## Refresh tokens

Refresh tokens are **not implemented** in this module.
The source of truth for auth state is the active `Session` row referenced by the JWT `sid`.

**Implemented vs planned:**
- Implemented: access-token issuance + server-side session validation/revocation.
- Planned (optional): refresh-token rotation semantics (and storage model) if a project needs longer-lived re-auth flows.
