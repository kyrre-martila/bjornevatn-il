import { Controller, Delete, Get, Post, Req } from "@nestjs/common";
import type { Request } from "express";

import { requireSuperAdmin } from "../../common/auth/admin-access";
import { readAccessToken } from "../../common/auth/read-access-token";
import { AuthService } from "../auth/auth.service";
import { StagingAdminService } from "./staging.service";

@Controller("admin/staging")
export class StagingController {
  constructor(
    private readonly authService: AuthService,
    private readonly stagingService: StagingAdminService,
  ) {}

  @Get("status")
  async getStatus() {
    return this.stagingService.getStatus();
  }

  @Post("reset-from-live")
  async resetFromLive(@Req() req: Request) {
    const actor = await this.requireSuperAdminActor(req);
    return this.stagingService.resetFromLive(actor);
  }

  @Post("push-to-live")
  async pushToLive(@Req() req: Request) {
    const actor = await this.requireSuperAdminActor(req);
    return this.stagingService.pushToLive(actor);
  }

  @Delete()
  async deleteStaging(@Req() req: Request) {
    const actor = await this.requireSuperAdminActor(req);
    return this.stagingService.deleteStaging(actor);
  }

  private async requireSuperAdminActor(req: Request) {
    await requireSuperAdmin(req, this.authService);
    const token = readAccessToken(req);
    const user = await this.authService.validateUser(token!);

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
    };
  }
}
