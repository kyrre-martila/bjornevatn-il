import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { AuditModule } from "../audit/audit.module";
import { StagingController } from "./staging.controller";
import { StagingAdminService } from "./staging.service";

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [StagingController],
  providers: [StagingAdminService],
})
export class StagingModule {}
