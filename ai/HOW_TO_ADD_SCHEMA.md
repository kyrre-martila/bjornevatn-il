# How to Add or Extend CMS Schema

## Location
- `/apps/api/modules/content`

## Rules
- Use Prisma models when needed.
- Add validation.
- Update OpenAPI contract.
- Expose content via API endpoints.

## Workflow
1. Define or extend content model fields in the content module.
2. Update Prisma schema/migrations when persistence changes are required.
3. Add input/output validation (DTOs, schema validators, or existing pattern).
4. Update API contract definitions so frontend/sdk remain aligned.
5. Add or extend endpoints/services for read/write access.
6. Verify RBAC behavior (`editor`, `admin`, `superadmin`) as relevant.
