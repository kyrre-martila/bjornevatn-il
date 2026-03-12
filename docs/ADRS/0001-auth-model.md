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
- Logout revokes the active server-side session. No refresh token rotation is used.
- Documentation must highlight different storage strategies (see [docs/SECURITY.md](../SECURITY.md)).
