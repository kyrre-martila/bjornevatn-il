import Link from "next/link";
import { headers } from "next/headers";

import { getMe } from "../lib/me";
import { canViewStagingStatus, canTriggerStagingActions } from "../lib/roles";
import { detectStagingEnvironment } from "../lib/environment";
import { StagingBannerActions } from "./StagingBannerActions";

export async function StagingBanner() {
  const requestHeaders = headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const environment = detectStagingEnvironment(host);

  if (!environment.isStaging) {
    return null;
  }

  const me = await getMe().catch(() => null);
  const role = me?.user?.role;
  const canOpenAdmin = canViewStagingStatus(role);
  const canRunActions = canTriggerStagingActions(role);

  return (
    <>
      <div className="staging-banner" role="status" aria-live="polite">
        <div className="staging-banner__inner">
        <strong>You are viewing STAGING</strong>
        <span className="staging-banner__pill">{environment.label}</span>
        {canOpenAdmin ? (
          <Link href="/admin" className="staging-banner__link">
            Open admin
          </Link>
        ) : null}
        <StagingBannerActions canRunActions={canRunActions} />
        </div>
      </div>
      <div className="staging-banner__spacer" aria-hidden="true" />
    </>
  );
}
