# Runbook: Debug Authentication Issues

## 401 / Invalid Credentials

1. Confirm user exists: `pnpm --filter @blueprint/db exec prisma user:find --email <email>` (or DB query).
2. Check password hashing version; trigger reset if mismatch.
3. Inspect logs for `AuthService` errors with matching `x-request-id`.

## CSRF Failures

1. Verify browser has both `XSRF-TOKEN` and signed `XSRF-TOKEN-SECRET` cookies set.
2. Ensure client sends `x-csrf-token` header equal to the `XSRF-TOKEN` cookie value.
3. Confirm request origin is allowlisted via `API_CORS_ORIGINS`.
4. Behind a proxy/tunnel, verify `x-forwarded-proto=https` is forwarded in production so secure cookies are accepted.

## CORS Errors

1. Reproduce via curl: `curl -H "Origin: https://app.localhost" -I https://api.localhost/api/v1/...`.
2. Check Traefik headers for `access-control-allow-origin`.
3. Update `API_CORS_ORIGINS` and redeploy if origin missing.
4. Inspect browser console for preflight failure details.

## Session Validation Issues

1. Query the `Session` table for the token `sid` to verify `revokedAt` and `expiresAt`.
2. If multiple stale sessions exist, revoke rows for the user and force re-login.
3. Re-authenticate and verify a new token contains a new `sid`.
