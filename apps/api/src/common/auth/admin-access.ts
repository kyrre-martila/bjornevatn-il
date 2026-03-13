import {
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";

import { AuthService } from "../../modules/auth/auth.service";
import { readAccessToken } from "./read-access-token";

export type UserRole = "editor" | "admin" | "super_admin";

const ROLE_RANK: Record<UserRole, number> = {
  editor: 1,
  admin: 2,
  super_admin: 3,
};

function normalizeRole(role: string | undefined | null): UserRole | null {
  if (!role) {
    return null;
  }

  const normalized = role.trim().toLowerCase();
  if (normalized === "editor" || normalized === "admin" || normalized === "super_admin") {
    return normalized;
  }

  return null;
}

export async function requireMinimumRole(
  req: Request,
  auth: AuthService,
  minimumRole: UserRole,
): Promise<UserRole> {
  const token = readAccessToken(req);
  if (!token) {
    throw new UnauthorizedException("Missing token");
  }

  const user = await auth.validateUser(token);
  const role = normalizeRole(user.role);
  if (!role) {
    throw new ForbiddenException("Access denied: invalid role.");
  }

  if (ROLE_RANK[role] < ROLE_RANK[minimumRole]) {
    throw new ForbiddenException("Access denied: insufficient role.");
  }

  return role;
}

export async function requireSuperAdmin(
  req: Request,
  auth: AuthService,
): Promise<void> {
  await requireMinimumRole(req, auth, "super_admin");
}
