import { Injectable, Logger } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";

export type AuditEntryInput = {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  log(entry: AuditEntryInput): void {
    void this.prisma.auditLog
      .create({
        data: {
          userId: entry.userId ?? null,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId ?? null,
          metadata: entry.metadata,
        },
      })
      .catch((error: unknown) => {
        const details = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to persist audit log: ${details}`);
      });
  }

  async list(filters: {
    userId?: string;
    action?: string;
    entityType?: string;
    offset?: number;
    cursor?: string;
    limit?: number;
  }) {
    const limit = Math.min(Math.max(filters.limit ?? 50, 1), 100);

    return this.prisma.auditLog.findMany({
      where: {
        ...(filters.userId ? { userId: filters.userId } : {}),
        ...(filters.action ? { action: filters.action } : {}),
        ...(filters.entityType ? { entityType: filters.entityType } : {}),
      },
      orderBy: { createdAt: "desc" },
      skip: filters.cursor ? 1 : filters.offset,
      cursor: filters.cursor ? { id: filters.cursor } : undefined,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            displayName: true,
          },
        },
      },
    });
  }
}
