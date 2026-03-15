import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Req,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";

import {
  requireMinimumRole,
  requireSuperAdmin,
} from "../../common/auth/admin-access";
import { readAccessToken } from "../../common/auth/read-access-token";
import { AuthService } from "../auth/auth.service";
import { StagingAdminService } from "./staging.service";

type PushToLiveRequestBody = {
  confirmPushToLive?: boolean;
  confirmationToken?: string;
};

@Controller("admin/staging")
export class StagingController {
  constructor(
    private readonly authService: AuthService,
    private readonly stagingService: StagingAdminService,
    private readonly config: ConfigService,
  ) {}

  @Get("status")
  async getStatus(@Req() req: Request) {
    const actor = await this.requireAdminActor(req);
    return this.stagingService.getStatus(actor);
  }

  @Post("reset-from-live")
  async resetFromLive(@Req() req: Request) {
    const actor = await this.requireSuperAdminActor(req);
    return this.stagingService.resetFromLive(actor);
  }

  @Post("push-to-live")
  async pushToLive(@Req() req: Request, @Body() body: PushToLiveRequestBody) {
    this.assertPushConfirmation(body);
    const actor = await this.requireSuperAdminActor(req);
    return this.stagingService.pushToLive(actor);
  }

  @Delete()
  async deleteStaging(@Req() req: Request) {
    const actor = await this.requireSuperAdminActor(req);
    return this.stagingService.deleteStaging(actor);
  }

  private assertPushConfirmation(body: PushToLiveRequestBody): void {
    if (body.confirmPushToLive !== true) {
      throw new BadRequestException(
        "push-to-live requires explicit confirmation. Set confirmPushToLive=true.",
      );
    }

    const requiredToken = this.config
      .get<string>("STAGING_PUSH_CONFIRMATION_TOKEN")
      ?.trim();
    if (requiredToken && body.confirmationToken !== requiredToken) {
      throw new BadRequestException("Invalid push-to-live confirmation token.");
    }
  }

  private async requireAdminActor(req: Request) {
    await requireMinimumRole(req, this.authService, "admin");
    const token = readAccessToken(req);
    const user = await this.authService.validateUser(token!);

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
    };
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
