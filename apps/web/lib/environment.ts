function normalizeEnvironmentValue(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function resolveDeploymentEnvironment(): string {
  return (
    normalizeEnvironmentValue(process.env.DEPLOY_ENV) ||
    normalizeEnvironmentValue(process.env.APP_ENV) ||
    normalizeEnvironmentValue(process.env.NODE_ENV) ||
    "development"
  );
}

function normalizeHostname(hostname: string): string {
  return hostname.split(":")[0]?.trim().toLowerCase() ?? "";
}

export function isStagingHostname(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);
  if (!normalized) return false;

  return (
    normalized === "staging" ||
    normalized.startsWith("staging.") ||
    normalized.includes("-staging") ||
    normalized.includes(".staging")
  );
}

export function detectStagingEnvironment(hostname: string | null): {
  isStaging: boolean;
  label: string;
} {
  const deploymentEnvironment = resolveDeploymentEnvironment();
  const environmentLabel = deploymentEnvironment.toUpperCase();
  const isStagingDeployment = deploymentEnvironment === "staging";
  const isStagingDomain = hostname ? isStagingHostname(hostname) : false;

  return {
    isStaging: isStagingDeployment || isStagingDomain,
    label: isStagingDeployment ? environmentLabel : "STAGING DOMAIN",
  };
}
