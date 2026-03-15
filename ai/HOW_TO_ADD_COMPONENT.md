# How to Add a Component

## Location
- `/apps/web/components`

## Component rules
- Components must be presentational.
- Content must come from CMS API.
- Avoid inline styling.
- Prefer reusable patterns.
- Keep components small and composable.

## Recommended process
1. Check if an existing component can be reused/extended.
2. Create a focused component with typed props.
3. Keep layout/styling consistent with existing patterns.
4. Wire data from page/container level (not hardcoded inside component).
5. Add/adjust tests or stories if the repo patterns include them.
