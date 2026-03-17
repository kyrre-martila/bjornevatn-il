import {
  Body,
  Controller,
  ForbiddenException,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Req,
} from "@nestjs/common";
import { ApiProperty, ApiTags } from "@nestjs/swagger";
import { IsIn } from "class-validator";
import type { Request } from "express";
import type { UsersRepository } from "@org/domain";

import { requireMinimumRole } from "../../common/auth/admin-access";
import { readAccessToken } from "../../common/auth/read-access-token";
import { AuditService } from "../audit/audit.service";
import { AuthService } from "../auth/auth.service";

class UpdateUserRoleDto {
  @ApiProperty({ enum: ["editor", "admin", "super_admin"] })
  @IsIn(["editor", "admin", "super_admin"])
  role!: "editor" | "admin" | "super_admin";
}

@ApiTags("users")
@Controller("admin/users")
export class UsersAdminController {
  constructor(
    @Inject("UsersRepository")
    private readonly usersRepository: UsersRepository,
    private readonly auth: AuthService,
    private readonly audit: AuditService,
  ) {}

  @Patch(":id/role")
  async updateRole(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: UpdateUserRoleDto,
  ) {
    const actorRole = await requireMinimumRole(req, this.auth, "admin");

    const actorId = await this.getCurrentUserId(req);
    const existing = await this.usersRepository.findById(id);
    if (!existing) {
      throw new NotFoundException("User not found");
    }

    this.assertRoleChangeAllowed({
      actorRole,
      actorId,
      targetUserId: id,
      targetCurrentRole: existing.role,
      nextRole: body.role,
    });

    const updated = await this.usersRepository.update(id, { role: body.role });

    this.audit.log({
      userId: actorId,
      action: "user_role_change",
      entityType: "user",
      entityId: id,
      metadata: {
        previousRole: existing?.role ?? null,
        nextRole: updated.role,
      },
    });

    return { id: updated.id, role: updated.role };
  }

  private assertRoleChangeAllowed(input: {
    actorRole: "editor" | "admin" | "super_admin";
    actorId: string | null;
    targetUserId: string;
    targetCurrentRole: "editor" | "admin" | "super_admin";
    nextRole: "editor" | "admin" | "super_admin";
  }): void {
    const {
      actorRole,
      actorId,
      targetUserId,
      targetCurrentRole,
      nextRole,
    } = input;

    if (nextRole === "super_admin" && actorRole !== "super_admin") {
      throw new ForbiddenException(
        "Access denied: only super_admin can assign super_admin.",
      );
    }

    if (
      targetCurrentRole === "super_admin" &&
      nextRole !== "super_admin" &&
      actorRole !== "super_admin"
    ) {
      throw new ForbiddenException(
        "Access denied: only super_admin can remove super_admin role.",
      );
    }

    if (
      actorRole !== "super_admin" &&
      actorId !== null &&
      actorId === targetUserId &&
      nextRole === "super_admin"
    ) {
      throw new ForbiddenException(
        "Access denied: admin cannot promote themselves to super_admin.",
      );
    }
  }

  private async getCurrentUserId(req: Request): Promise<string | null> {
    const access = readAccessToken(req);
    if (!access) {
      return null;
    }

    try {
      const user = await this.auth.validateUser(access);
      return user.id;
    } catch {
      return null;
    }
  }
}
