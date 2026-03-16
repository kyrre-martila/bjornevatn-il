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

## Session renewal behavior

The model intentionally avoids long-lived refresh tokens. Instead, clients may call `POST /auth/refresh` while they still have an active `access` cookie.

- The endpoint validates the current JWT and session row (`sid`).
- If valid and unexpired, it issues a fresh access JWT with the same `sid` and updates `Session.expiresAt` to match the new JWT expiry.
- If the session is revoked/expired, the endpoint returns `401` and clients should redirect to login.

This keeps auth session-first, preserves immediate revocation semantics, and reduces silent expiry surprises for active editors.
