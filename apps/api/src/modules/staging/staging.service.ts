import { ConflictException, Injectable } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { STAGING_AUDIT_EVENTS } from "./staging-audit-events";
import { StagingEnvironmentService } from "./staging-environment.service";

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly stagingEnvironmentService: StagingEnvironmentService,
  ) {}

  private logStagingAudit(entry: {
    actor: Actor;
    action: (typeof STAGING_AUDIT_EVENTS)[keyof typeof STAGING_AUDIT_EVENTS];
    status: "success" | "failed";
    metadata?: Record<string, unknown>;
  }): void {
    this.audit.log({
      userId: entry.actor.userId,
      action: entry.action,
      entityType: "site_environment",
      entityId: "staging",
      metadata: {
        actorEmail: entry.actor.email ?? null,
        actorName: entry.actor.name ?? null,
        actorUserId: entry.actor.userId,
        action: entry.action,
        environment: "staging",
        status: entry.status,
        timestamp: new Date().toISOString(),
        ...(entry.metadata ?? {}),
      },
    });
  }

  private getErrorDetails(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      return {
        errorName: error.name,
        errorMessage: error.message,
      };
    }

    return {
      errorMessage: String(error),
    };
  }

  async getStatus(actor?: Actor): Promise<StagingStatusResponse> {
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
      this.logStagingAudit({
        actor: actor ?? { userId: "system" },
        action: STAGING_AUDIT_EVENTS.viewed,
        status: "success",
        metadata: {
          lockStatus: "idle",
          state: "deleted",
          exists: false,
          resultSummary:
            "Staging status viewed with no staging environment record.",
        },
      });

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

    this.logStagingAudit({
      actor:
        actor ??
        ({
          userId: status.lastActorUser?.id ?? "system",
          email: status.lastActorUser?.email ?? undefined,
          name:
            status.lastActorUser?.displayName ??
            status.lastActorUser?.name ??
            undefined,
        } satisfies Actor),
      action: STAGING_AUDIT_EVENTS.viewed,
      status: "success",
      metadata: {
        lockStatus: status.lockStatus,
        state: status.state,
        exists: status.state !== "deleted",
        resultSummary: "Staging status viewed.",
      },
    });

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
    let lockAcquired = false;

    try {
      await this.acquireLock("syncing", actor.userId);
      lockAcquired = true;
      await this.stagingEnvironmentService.resetStagingFromLive();

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

      this.logStagingAudit({
        actor,
        action: STAGING_AUDIT_EVENTS.resetFromLive,
        status: "success",
        metadata: {
          lockStatus: "idle",
          resultSummary: "Staging environment reset from live.",
        },
      });

      return this.getStatus(actor);
    } catch (error) {
      if (lockAcquired) {
        await this.releaseLockAsStale(actor.userId);
      }
      this.logStagingAudit({
        actor,
        action: STAGING_AUDIT_EVENTS.actionFailed,
        status: "failed",
        metadata: {
          failedAction: STAGING_AUDIT_EVENTS.resetFromLive,
          lockStatus: "idle",
          resultSummary: "Failed to reset staging environment from live.",
          ...this.getErrorDetails(error),
        },
      });
      throw error;
    }
  }

  async pushToLive(actor: Actor): Promise<StagingStatusResponse> {
    let lockAcquired = false;

    try {
      await this.acquireLock("pushing", actor.userId);
      lockAcquired = true;
      await this.stagingEnvironmentService.pushStagingToLive();

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

      this.logStagingAudit({
        actor,
        action: STAGING_AUDIT_EVENTS.pushToLive,
        status: "success",
        metadata: {
          lockStatus: "idle",
          resultSummary: "Staging environment pushed to live.",
        },
      });

      return this.getStatus(actor);
    } catch (error) {
      if (lockAcquired) {
        await this.releaseLockAsStale(actor.userId);
      }
      this.logStagingAudit({
        actor,
        action: STAGING_AUDIT_EVENTS.actionFailed,
        status: "failed",
        metadata: {
          failedAction: STAGING_AUDIT_EVENTS.pushToLive,
          lockStatus: "idle",
          resultSummary: "Failed to push staging environment to live.",
          ...this.getErrorDetails(error),
        },
      });
      throw error;
    }
  }

  async deleteStaging(actor: Actor): Promise<StagingStatusResponse> {
    let lockAcquired = false;

    try {
      await this.acquireLock("deleting", actor.userId);
      lockAcquired = true;
      await this.stagingEnvironmentService.deleteStagingEnvironment();

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

      this.logStagingAudit({
        actor,
        action: STAGING_AUDIT_EVENTS.deleted,
        status: "success",
        metadata: {
          lockStatus: "idle",
          resultSummary: "Staging environment deleted.",
        },
      });

      return this.getStatus(actor);
    } catch (error) {
      if (lockAcquired) {
        await this.releaseLockAsStale(actor.userId);
      }
      this.logStagingAudit({
        actor,
        action: STAGING_AUDIT_EVENTS.actionFailed,
        status: "failed",
        metadata: {
          failedAction: STAGING_AUDIT_EVENTS.deleted,
          lockStatus: "idle",
          resultSummary: "Failed to delete staging environment.",
          ...this.getErrorDetails(error),
        },
      });
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
