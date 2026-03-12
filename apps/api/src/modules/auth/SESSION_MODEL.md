# Authentication session model

The API uses **stateful server-side sessions backed by the `Session` table** while still issuing JWT access tokens.

## How it works

1. On login/register, the API creates a random session id (`sid`) and includes it in the JWT payload.
2. The same `sid` is persisted in the `Session.token` field with metadata (`userId`, IP, user-agent, expiry).
3. Every authenticated request validates both:
   - JWT signature/expiry, and
   - session state in the database (must exist, not revoked, and not expired).
4. Logout revokes the active session by setting `revokedAt`.

This guarantees revoked sessions are rejected immediately, even if the JWT itself has not yet expired.

## Refresh tokens

Refresh tokens are **not implemented** in this module right now.
To avoid a misleading partial implementation, session lifecycle for access tokens is the source of truth.
If refresh tokens are added later, they should also map to `Session` (or a child token table) with explicit revocation and rotation semantics.
