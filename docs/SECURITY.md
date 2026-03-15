# Security Operations

Security guidance for the content website blueprint (public site + admin/editor surfaces).

## Required Secrets

- `JWT_SECRET`: HMAC signing key for access tokens. Must be 32+ characters, include at least 10 unique characters, and mix at least three character classes (lower/upper/number/symbol).
- `COOKIE_SECRET`: Signature key for cookies/CSRF derivation. Must be 32+ characters, include at least 10 unique characters, and mix at least three character classes (lower/upper/number/symbol).
- `COOKIE_DOMAIN`: Shared domain for web cookies (prod uses apex domain).
- `API_CORS_ORIGINS`: Comma-separated list of allowed origins (required in hardened envs: production and staging).
- `ENCRYPTION_KEY` is no longer startup-required because field-level encryption is not wired in this blueprint yet; add and enforce it only when encrypted-at-rest fields are implemented.

## Cookie Policy

- Authentication cookies are `HttpOnly`, `Secure`, `SameSite=Strict` in the current implementation.
- Path: `/`; Domain uses `COOKIE_DOMAIN` env.
- Non-HttpOnly CSRF cookie: `SameSite=Strict`, `Secure` in prod (or when `x-forwarded-proto=https`).
- HttpOnly signed CSRF secret cookie: `SameSite=Strict`, `Secure` in prod.

## CSRF Flow

- API issues a signed HttpOnly CSRF secret cookie (`XSRF-TOKEN-SECRET`) and a readable derived token cookie (`XSRF-TOKEN`).
- Clients send `x-csrf-token` header on state-changing requests, and API validates it against the signed secret using HMAC (double-submit cookie pattern).
- Bearer-token and `/api/v1/mobile/*` requests remain CSRF-exempt for non-cookie clients.

## CORS Configuration

- API reads `API_CORS_ORIGINS` and rejects requests whose `Origin` is missing from the allowlist.
- In hardened environments (`NODE_ENV=production` or `DEPLOY_ENV/APP_ENV=staging`), startup fails fast when `API_CORS_ORIGINS` is missing or empty; explicit trusted origins are mandatory.
- In non-production environments, API falls back to local defaults: `http://localhost:3000` and `http://127.0.0.1:3000`.
- Update the env var during deployments to add/remove origins for public and admin website domains.

## Token Handling

- Staging domain and staging management surfaces are protected by the existing cookie/session auth flow: unauthenticated requests receive 401 (or are redirected to `/login` for pages), `editor` is forbidden, and only `admin`/`superadmin` can access staging routes; destructive staging operations remain superadmin-only.
- Access tokens are short-lived and include a session id (`sid`).
- API accepts a token only when JWT verification succeeds **and** the referenced `Session` row is active.
- Logout and forced sign-out revoke the server-side session immediately.
- Web/admin authentication is cookie-first: login/register set the `access` HttpOnly cookie, SSR forwards cookies to `/me`, and logout revokes the server-side session then clears the cookie.
- Bearer `Authorization` headers remain supported for non-browser API clients and tooling.
- No refresh-token endpoint is active in the API auth module; clients re-authenticate on expiry.

**Implemented vs planned:** OAuth/SSO and refresh-token rotation are not wired by default in this blueprint.

## Incident Response Checklist

1. Rotate `JWT_SECRET` and `COOKIE_SECRET`.
2. Trigger forced logout by revoking active rows in the `Session` table (or rotating JWT secrets for broad invalidation).
3. Revoke active tokens and invalidate caches.
4. Update `API_CORS_ORIGINS` if origin compromise suspected.
5. Redeploy services with new secrets.
6. Document incident and follow [docs/RUNBOOKS/incident-response.md](RUNBOOKS/incident-response.md).

## Reverse Proxy / Tunnel Notes

- API enables `trust proxy` so secure-cookie handling works correctly behind ingress/load balancers.
- In hardened environments (staging + production), CSRF cookies are always marked `Secure`.


## Environment parity matrix

- development/test: local CSRF fallback behavior may be enabled for developer ergonomics and CI.
- staging/production: CSRF fallback behavior is disabled; cookies are always secure; explicit CORS/public URL configuration is required at startup.
