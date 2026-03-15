import { redirect } from "next/navigation";

import { getAdminStagingStatus } from "../../../../lib/admin/staging";
import { getMe } from "../../../../lib/me";
import {
  canAccessDeveloperTools,
  canTriggerStagingActions,
  canViewStagingStatus,
} from "../../../../lib/roles";
import { StagingControlsClient } from "./StagingControlsClient";

export default async function AdminStagingPage() {
  const me = await getMe();
  const role = me?.user?.role;
  if (!canAccessDeveloperTools(role)) {
    redirect("/access-denied");
  }

  const status = canViewStagingStatus(role) ? await getAdminStagingStatus() : null;

  return (
    <section className="hero" aria-labelledby="staging-heading">
      <p className="hero__eyebrow">Website operations</p>
      <h1 id="staging-heading" className="hero__title">
        Staging access
      </h1>
      <p className="hero__subtitle">
        Use this area to validate content changes before public launch. Admins
        can inspect status and log into staging, while superadmins can run
        destructive staging actions.
      </p>
      <StagingControlsClient
        canTriggerActions={canTriggerStagingActions(role)}
        initialStatus={status}
      />
    </section>
  );
}
