# Security Operations

Security guidance for the content website blueprint (public site + admin/editor surfaces).

## Required Secrets

- `JWT_SECRET`: HMAC signing key for access tokens.
- `COOKIE_SECRET`: Encryption/signature for session cookies.
- `ENCRYPTION_KEY`: 32-byte key for at-rest sensitive fields.
- `COOKIE_DOMAIN`: Shared domain for web cookies (prod uses apex domain).
- `API_CORS_ORIGINS`: Comma-separated list of allowed origins (required in production).

## Cookie Policy

- Authentication cookies are `HttpOnly`, `Secure`, `SameSite=Strict` (fallback `Lax` for OAuth redirect flows).
- Path: `/`; Domain uses `COOKIE_DOMAIN` env.
- Non-HttpOnly CSRF cookie: `SameSite=Strict`, `Secure` in prod (or when `x-forwarded-proto=https`).
- HttpOnly signed CSRF secret cookie: `SameSite=Strict`, `Secure` in prod.

## CSRF Flow

- API issues a signed HttpOnly CSRF secret cookie (`XSRF-TOKEN-SECRET`) and a readable derived token cookie (`XSRF-TOKEN`).
- Clients send `x-csrf-token` header on state-changing requests, and API validates it against the signed secret using HMAC (double-submit cookie pattern).
- Bearer-token and `/api/v1/mobile/*` requests remain CSRF-exempt for non-cookie clients.

## CORS Configuration

- API reads `API_CORS_ORIGINS` and rejects requests whose `Origin` is missing from the allowlist.
- In `NODE_ENV=production`, startup fails fast when `API_CORS_ORIGINS` is missing or empty.
- In non-production environments, API falls back to local defaults: `http://localhost:3000` and `http://127.0.0.1:3000`.
- Update the env var during deployments to add/remove origins for public and admin website domains.

## Token Handling

- Access tokens short-lived; refresh tokens rotated on each refresh call.
- Refresh token rotation persists last valid token hash; revoked tokens are denied on reuse.
- Web stores tokens in secure cookies.

## Incident Response Checklist

1. Rotate `JWT_SECRET`, `COOKIE_SECRET`, and `ENCRYPTION_KEY`.
2. Trigger forced logout by clearing refresh token table or versioning session secrets.
3. Revoke active tokens and invalidate caches.
4. Update `API_CORS_ORIGINS` if origin compromise suspected.
5. Redeploy services with new secrets.
6. Document incident and follow [docs/RUNBOOKS/incident-response.md](RUNBOOKS/incident-response.md).

## Reverse Proxy / Tunnel Notes

- API enables `trust proxy` so secure-cookie handling works correctly behind ingress/load balancers.
- In production, CSRF cookies are marked `Secure`; requests forwarded with `x-forwarded-proto=https` are treated as secure.
