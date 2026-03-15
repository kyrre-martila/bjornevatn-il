# How to Build a New Site (AI Workflow)

## Step 1 — Define pages
Start with required routes, then add client-specific routes.

Common pages:
- home
- about
- services
- contact
- privacy

## Step 2 — Create reusable components
Build reusable UI blocks before page assembly.

Common components:
- hero section
- feature grid
- CTA section
- testimonials
- footer

## Step 3 — Create CMS schema
Define content types and fields first, then relations/validation.

Location:
- `/apps/api/modules/content`

## Step 4 — Register frontend pages
Create/attach routes in the Next.js app router.

Location:
- `/apps/web/app`

## Step 5 — Connect frontend to CMS API
Bind each page/component to CMS-backed data.

Rule:
- All visible content must come from CMS.
- Do not hardcode text inside React components.

## Step 6 — Validate end-to-end
- verify schema is exposed by API
- verify frontend renders CMS content
- verify draft/publish behavior where applicable
