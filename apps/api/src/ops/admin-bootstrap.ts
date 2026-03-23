import { bootstrapFirstAdminFromEnv, disconnectAdminOps } from "./admin-ops.js";
import { loadLocalEnvFiles } from "./load-env-files.js";

async function main() {
  loadLocalEnvFiles();

  const result = await bootstrapFirstAdminFromEnv();
  if (result.status === "skipped") {
    console.info(result.reason);
    return;
  }

  console.info(
    `Created bootstrap super_admin ${result.user.email} (${result.user.id}).`,
  );
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`admin:bootstrap failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectAdminOps();
  });
