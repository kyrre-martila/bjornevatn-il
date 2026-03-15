# Deployment Model (High Level)

## Environments
- `live`
- `staging`

## Typical deployment flow
1. develop feature
2. test in staging
3. push staging to live
4. verify production

## Staging management actions
- **reset staging from live**: copy/sync live state into staging baseline
- **push staging to live**: promote validated staging release to production
- **delete staging environment**: remove ephemeral staging instance when no longer needed

## Operational guidance
- Always validate content, routing, and publish workflow in staging before live promotion.
- Prefer repeatable deployment scripts/pipelines over manual one-off changes.
