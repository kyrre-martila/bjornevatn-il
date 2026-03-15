# How to Add a Page

## Goal
Add a new route that renders CMS-driven content using reusable components.

## Steps
1. Create route file:
   - `/apps/web/app/<slug>/page.tsx`
2. Fetch page data through the CMS API client.
3. Map API data to existing reusable components.
4. Compose the page from presentational components.
5. Handle empty/missing content gracefully.

## Rules
- Do not embed static marketing text in the page component.
- Keep data fetching and rendering logic clear and minimal.
- Reuse shared components before creating new ones.
