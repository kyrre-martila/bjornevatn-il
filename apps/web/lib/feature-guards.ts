import { hasMinimumRole, hasRole } from "./rbac";

export function canEditSlug(role: string | undefined | null): boolean {
  return hasMinimumRole(role, "admin");
}

export function canManageUsers(role: string | undefined | null): boolean {
  return hasMinimumRole(role, "admin");
}

export function canAccessSchema(role: string | undefined | null): boolean {
  return hasRole(role, "super_admin");
}

export function canEditRelations(role: string | undefined | null): boolean {
  return hasMinimumRole(role, "admin");
}
