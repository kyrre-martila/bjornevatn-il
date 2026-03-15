import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { exec } from "node:child_process";
import { promisify } from "node:util";

import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

const execAsync = promisify(exec);

type Actor = {
  userId: string;
  email?: string;
  name?: string | null;
};

type StagingStatusResponse = {
  environment: "staging";
  exists: boolean;
  state: "active" | "stale" | "deleted";
  lockStatus: "idle" | "syncing" | "pushing" | "deleting";
  message: string;
  lastResetAt: string | null;
  lastPushedAt: string | null;
  updatedAt: string | null;
  actor: {
    id: string;
    email: string | null;
    name: string | null;
  } | null;
};

@Injectable()
export class StagingAdminService {
  private readonly logger = new Logger(StagingAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async getStatus(): Promise<StagingStatusResponse> {
    const status = await this.prisma.siteEnvironmentStatus.findUnique({
      where: { environment: "staging" },
      include: {
        lastActorUser: {
          select: {
            id: true,
            email: true,
            name: true,
            displayName: true,
          },
        },
      },
    });

    if (!status) {
      return {
        environment: "staging",
        exists: false,
        state: "deleted",
        lockStatus: "idle",
        message: "Staging environment has not been initialized.",
        lastResetAt: null,
        lastPushedAt: null,
        updatedAt: null,
        actor: null,
      };
    }

    return {
      environment: "staging",
      exists: status.state !== "deleted",
      state: status.state,
      lockStatus: status.lockStatus,
      message: this.buildStatusMessage(status.state, status.lockStatus),
      lastResetAt: status.lastResetAt?.toISOString() ?? null,
      lastPushedAt: status.lastPushedAt?.toISOString() ?? null,
      updatedAt: status.updatedAt.toISOString(),
      actor: status.lastActorUser
        ? {
            id: status.lastActorUser.id,
            email: status.lastActorUser.email,
            name: status.lastActorUser.displayName ?? status.lastActorUser.name,
          }
        : null,
    };
  }

  async resetFromLive(actor: Actor): Promise<StagingStatusResponse> {
    await this.acquireLock("syncing", actor.userId);
    try {
      await this.runConfiguredCommand(
        "STAGING_RESET_DB_COMMAND",
        "reset staging database from live",
      );
      await this.runConfiguredCommand(
        "STAGING_SYNC_UPLOADS_FROM_LIVE_COMMAND",
        "sync uploads from live to staging",
      );

      await this.prisma.siteEnvironmentStatus.upsert({
        where: { environment: "staging" },
        create: {
          environment: "staging",
          state: "active",
          lockStatus: "idle",
          lastResetAt: new Date(),
          lastActorUserId: actor.userId,
        },
        update: {
          state: "active",
          lockStatus: "idle",
          lastResetAt: new Date(),
          lastActorUserId: actor.userId,
        },
      });

      this.audit.log({
        userId: actor.userId,
        action: "staging.reset_from_live",
        entityType: "site_environment",
        entityId: "staging",
        metadata: {
          actorEmail: actor.email ?? null,
          actorName: actor.name ?? null,
        },
      });

      return this.getStatus();
    } catch (error) {
      await this.releaseLockAsStale(actor.userId);
      throw error;
    }
  }

  async pushToLive(actor: Actor): Promise<StagingStatusResponse> {
    await this.acquireLock("pushing", actor.userId);
    try {
      await this.runConfiguredCommand(
        "STAGING_PUSH_DB_TO_LIVE_COMMAND",
        "copy staging database to live",
      );
      await this.runConfiguredCommand(
        "STAGING_SYNC_UPLOADS_TO_LIVE_COMMAND",
        "sync uploads from staging to live",
      );
      await this.triggerRevalidationHook();

      await this.prisma.siteEnvironmentStatus.upsert({
        where: { environment: "staging" },
        create: {
          environment: "staging",
          state: "active",
          lockStatus: "idle",
          lastPushedAt: new Date(),
          lastActorUserId: actor.userId,
        },
        update: {
          state: "active",
          lockStatus: "idle",
          lastPushedAt: new Date(),
          lastActorUserId: actor.userId,
        },
      });

      this.audit.log({
        userId: actor.userId,
        action: "staging.push_to_live",
        entityType: "site_environment",
        entityId: "staging",
        metadata: {
          actorEmail: actor.email ?? null,
          actorName: actor.name ?? null,
        },
      });

      return this.getStatus();
    } catch (error) {
      await this.releaseLockAsStale(actor.userId);
      throw error;
    }
  }

  async deleteStaging(actor: Actor): Promise<StagingStatusResponse> {
    await this.acquireLock("deleting", actor.userId);
    try {
      await this.runConfiguredCommand(
        "STAGING_DELETE_COMMAND",
        "delete staging environment",
      );

      await this.prisma.siteEnvironmentStatus.upsert({
        where: { environment: "staging" },
        create: {
          environment: "staging",
          state: "deleted",
          lockStatus: "idle",
          lastResetAt: null,
          lastPushedAt: null,
          lastSyncedAt: null,
          lastActorUserId: actor.userId,
        },
        update: {
          state: "deleted",
          lockStatus: "idle",
          lastResetAt: null,
          lastPushedAt: null,
          lastSyncedAt: null,
          lastActorUserId: actor.userId,
        },
      });

      this.audit.log({
        userId: actor.userId,
        action: "staging.deleted",
        entityType: "site_environment",
        entityId: "staging",
        metadata: {
          actorEmail: actor.email ?? null,
          actorName: actor.name ?? null,
        },
      });

      return this.getStatus();
    } catch (error) {
      await this.releaseLockAsStale(actor.userId);
      throw error;
    }
  }

  private async acquireLock(
    lockStatus: "syncing" | "pushing" | "deleting",
    actorUserId: string,
  ): Promise<void> {
    await this.prisma.siteEnvironmentStatus.upsert({
      where: { environment: "staging" },
      create: {
        environment: "staging",
        state: "active",
        lockStatus: "idle",
        lastActorUserId: actorUserId,
      },
      update: {},
    });

    const lockResult = await this.prisma.siteEnvironmentStatus.updateMany({
      where: {
        environment: "staging",
        lockStatus: "idle",
      },
      data: {
        lockStatus,
        lastActorUserId: actorUserId,
      },
    });

    if (lockResult.count !== 1) {
      throw new ConflictException(
        "A staging operation is already in progress. Please wait until it completes.",
      );
    }
  }

  private async releaseLockAsStale(actorUserId: string): Promise<void> {
    await this.prisma.siteEnvironmentStatus.update({
      where: { environment: "staging" },
      data: {
        state: "stale",
        lockStatus: "idle",
        lastActorUserId: actorUserId,
      },
    });
  }

  private async runConfiguredCommand(
    envKey: string,
    operationName: string,
  ): Promise<void> {
    const command = this.config.get<string>(envKey)?.trim();
    if (!command) {
      throw new InternalServerErrorException(
        `Staging operation misconfigured: ${envKey} is required to ${operationName}.`,
      );
    }

    try {
      await execAsync(command, {
        shell: "/bin/bash",
        env: process.env,
      });
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to ${operationName}: ${details}`);
      throw new InternalServerErrorException(
        `Failed to ${operationName}.`,
      );
    }
  }

  private async triggerRevalidationHook(): Promise<void> {
    const hookUrl = this.config
      .get<string>("STAGING_PUSH_REVALIDATE_HOOK_URL")
      ?.trim();
    if (!hookUrl) {
      return;
    }

    try {
      const response = await fetch(hookUrl, { method: "POST" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Revalidation hook failed: ${details}`);
      throw new InternalServerErrorException(
        "Failed to trigger revalidation hook after push.",
      );
    }
  }

  private buildStatusMessage(
    state: "active" | "stale" | "deleted",
    lockStatus: "idle" | "syncing" | "pushing" | "deleting",
  ): string {
    if (lockStatus !== "idle") {
      return `Staging operation in progress (${lockStatus}).`;
    }

    switch (state) {
      case "active":
        return "Staging environment is ready.";
      case "stale":
        return "Staging environment is stale due to a failed operation.";
      case "deleted":
        return "Staging environment is deleted.";
    }
  }
}

export type { Actor, StagingStatusResponse };
