import {
  Controller,
  Get,
  HttpCode,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

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
      await this.prisma.$connect();
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: "ok",
        check: "ready",
      };
    } catch {
      throw new ServiceUnavailableException({
        status: "error",
        check: "ready",
      });
    }
  }
}
