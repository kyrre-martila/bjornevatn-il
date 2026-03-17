import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ClubhouseController } from "./clubhouse.controller";
import { ClubhouseService } from "./clubhouse.service";

@Module({
  imports: [AuthModule],
  controllers: [ClubhouseController],
  providers: [ClubhouseService],
  exports: [ClubhouseService],
})
export class ClubhouseModule {}
