import { disconnectAdminOps, resetAdminPasswordFromEnv } from "./admin-ops.js";
import { loadLocalEnvFiles } from "./load-env-files.js";

async function main() {
  loadLocalEnvFiles();

  const result = await resetAdminPasswordFromEnv();
  console.info(
    `Updated password for ${result.user.email} and revoked sessions.`,
  );
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`admin:reset-password failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectAdminOps();
  });
