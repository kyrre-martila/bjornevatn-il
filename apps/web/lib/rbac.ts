export const ROLES = ["editor", "admin", "super_admin"] as const;

export type UserRole = (typeof ROLES)[number];

const ROLE_RANK: Record<UserRole, number> = {
  editor: 1,
  admin: 2,
  super_admin: 3,
};

export function normalizeRole(role: string | undefined | null): UserRole | null {
  if (!role) return null;
  const normalized = role.trim().toLowerCase();
  if (normalized === "editor" || normalized === "admin" || normalized === "super_admin") {
    return normalized;
  }
  return null;
}

export function hasMinimumRole(
  role: string | undefined | null,
  requiredRole: UserRole,
): boolean {
  const normalized = normalizeRole(role);
  if (!normalized) return false;
  return ROLE_RANK[normalized] >= ROLE_RANK[requiredRole];
}

export function hasRole(role: string | undefined | null, requiredRole: UserRole): boolean {
  return normalizeRole(role) === requiredRole;
}
