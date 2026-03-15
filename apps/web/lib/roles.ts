import { normalizeRole } from "./rbac";

function isAdminOrSuperadmin(role: string | undefined | null): boolean {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === "admin" || normalizedRole === "super_admin";
}

export function canViewStagingStatus(role: string | undefined | null): boolean {
  return isAdminOrSuperadmin(role);
}

export function canTriggerStagingActions(role: string | undefined | null): boolean {
  return normalizeRole(role) === "super_admin";
}

export function canEditSlug(role: string | undefined | null): boolean {
  return isAdminOrSuperadmin(role);
}

export function canManageUsers(role: string | undefined | null): boolean {
  return isAdminOrSuperadmin(role);
}

export function canAccessSchema(role: string | undefined | null): boolean {
  return normalizeRole(role) === "super_admin";
}

export function canManageTaxonomies(role: string | undefined | null): boolean {
  return isAdminOrSuperadmin(role);
}

export function canAccessDeveloperTools(role: string | undefined | null): boolean {
  return canViewStagingStatus(role);
}
