import { Global, Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ObservabilityController } from "./observability.controller";
import { ObservabilityService } from "./observability.service";

@Global()
@Module({
  imports: [AuthModule],
  controllers: [ObservabilityController],
  providers: [ObservabilityService],
  exports: [ObservabilityService],
})
export class ObservabilityModule {}
