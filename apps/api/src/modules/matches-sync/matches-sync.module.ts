import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ObservabilityModule } from "../observability/observability.module";
import { MatchesSyncController } from "./matches-sync.controller";
import { MatchesSyncService } from "./matches-sync.service";
import { ICalMatchProvider } from "./providers/ical-match.provider";

@Module({
  imports: [AuthModule, ObservabilityModule],
  controllers: [MatchesSyncController],
  providers: [MatchesSyncService, ICalMatchProvider],
})
export class MatchesSyncModule {}
