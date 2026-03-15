import { ConflictException, Injectable } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
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
