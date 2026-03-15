import {
  Controller,
  Get,
  HttpCode,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

type ReadinessPayload = {
  status: "ok" | "error";
  check: "ready";
  dependencies: {
    database: "up" | "down";
  };
};

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("live")
  @HttpCode(200)
  live() {
    return {
      status: "ok",
      check: "live",
    };
  }

  @Get()
  async health() {
    return this.ready();
  }

  @Get("ready")
  @HttpCode(200)
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: "ok",
        check: "ready",
        dependencies: {
          database: "up",
        },
      } satisfies ReadinessPayload;
    } catch (error) {
      const reason = error instanceof Error ? error.message : "database check failed";

      throw new ServiceUnavailableException({
        status: "error",
        check: "ready",
        dependencies: {
          database: "down",
        },
        reason,
      } satisfies ReadinessPayload & { reason: string });
    }
  }
}
