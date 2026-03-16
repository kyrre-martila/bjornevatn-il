import { RedirectsPrismaRepository } from "@org/domain-adapters-prisma";
import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { AuditModule } from "../audit/audit.module";
import { RedirectsController } from "./redirects.controller";

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [RedirectsController],
  providers: [
    {
      provide: "RedirectsRepository",
      useClass: RedirectsPrismaRepository,
    },
  ],
})
export class RedirectsModule {}
