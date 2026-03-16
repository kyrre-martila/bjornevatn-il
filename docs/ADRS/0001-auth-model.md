# ADR 0001: Authentication Model

## Status

Accepted

## Context

- Web clients require CSRF protection and immediate server-side session revocation.
- Mobile clients cannot rely on browser cookies and need bearer tokens for API calls.

## Decision

- Use access JWTs with embedded session ids (`sid`) and validate each request against the server-side `Session` table.
- Maintain shared token issuance and revocation logic across channels.

## Consequences

- CSRF middleware required for cookie sessions.
- Logout revokes the active server-side session.
- Session renewal uses `POST /auth/refresh` to reissue short-lived access JWTs for active sessions (same `sid`, server-side expiry extended).
- Full refresh-token rotation is intentionally not part of this model.
- Documentation must highlight different storage strategies (see [docs/SECURITY.md](../SECURITY.md)).
