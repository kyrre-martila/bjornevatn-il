import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const REQUIRED_ENVIRONMENT_KEYS = [
  "LIVE_DATABASE_URL",
  "STAGING_DATABASE_URL",
  "LIVE_UPLOADS_PATH",
  "STAGING_UPLOADS_PATH",
] as const;

@Injectable()
export class StagingEnvironmentService {
  private readonly logger = new Logger(StagingEnvironmentService.name);

  constructor(private readonly config: ConfigService) {}

  async resetStagingFromLive(): Promise<void> {
    this.assertRequiredConfiguration();
    await this.runScript("copy-live-db-to-staging");
    await this.runScript("sync-uploads-live-to-staging");
  }

  async pushStagingToLive(): Promise<void> {
    this.assertRequiredConfiguration();
    await this.runScript("copy-staging-db-to-live");
    await this.runScript("sync-uploads-staging-to-live");
  }

  async deleteStagingEnvironment(): Promise<void> {
    this.assertRequiredConfiguration();
    await this.runScript("delete-staging");
  }

  private assertRequiredConfiguration() {
    const missing = REQUIRED_ENVIRONMENT_KEYS.filter((key) => {
      const value = this.config.get<string>(key)?.trim();
      return !value;
    });

    if (missing.length > 0) {
      throw new InternalServerErrorException(
        `Staging environment operations are misconfigured. Missing required values: ${missing.join(", ")}.`,
      );
    }
  }

  private resolveScriptPath(): string {
    const configuredPath = this.config.get<string>("STAGING_SYNC_SCRIPT_PATH")?.trim();
    if (configuredPath) {
      return configuredPath;
    }

    const candidates = [
      resolve(process.cwd(), "scripts/staging-env-sync.sh"),
      resolve(process.cwd(), "apps/api/scripts/staging-env-sync.sh"),
    ];

    const scriptPath = candidates.find((candidate) => existsSync(candidate));
    if (!scriptPath) {
      throw new InternalServerErrorException(
        "Staging environment sync script not found. Set STAGING_SYNC_SCRIPT_PATH to an absolute path.",
      );
    }

    return scriptPath;
  }

  private async runScript(operation: string): Promise<void> {
    const scriptPath = this.resolveScriptPath();

    try {
      await execFileAsync("bash", [scriptPath, operation], {
        env: process.env,
      });
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      this.logger.error(`Staging environment operation failed (${operation}): ${details}`);
      throw new InternalServerErrorException(
        `Failed to complete staging environment operation (${operation}).`,
      );
    }
  }
}
