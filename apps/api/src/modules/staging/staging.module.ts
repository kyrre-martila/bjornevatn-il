import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { AuditModule } from "../audit/audit.module";
import { StagingController } from "./staging.controller";
import { StagingEnvironmentService } from "./staging-environment.service";
import { StagingAdminService } from "./staging.service";

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [StagingController],
  providers: [StagingAdminService, StagingEnvironmentService],
})
export class StagingModule {}
