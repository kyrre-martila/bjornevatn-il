import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { HealthModule } from "./health/health.module";
import { RedirectsModule } from "./redirects/redirects.module";
import { UsersModule } from "./users/users.module";
import { ContentModule } from "./content/content.module";
import { LoggerModule } from "../common/logging/logger.module";
import { MetricsModule } from "../common/metrics/metrics.module";
import { AuditModule } from "./audit/audit.module";
import { AuditAdminModule } from "./audit/audit-admin.module";
import { StagingModule } from "./staging/staging.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule,
    MetricsModule,
    PrismaModule,
    UsersModule,
    ContentModule,
    AuthModule,
    HealthModule,
    RedirectsModule,
    AuditModule,
    AuditAdminModule,
    StagingModule,
  ],
})
export class AppModule {}
