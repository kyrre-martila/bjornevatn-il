import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { RedirectsController } from "./redirects.controller";

@Module({
  imports: [AuthModule],
  controllers: [RedirectsController],
})
export class RedirectsModule {}
