import { redirect } from "next/navigation";

import { getMe } from "../../../../lib/me";
import { hasMinimumRole } from "../../../../lib/rbac";
import { listAdminSettings } from "../../../../lib/admin/settings";
import { SettingsEditorClient } from "./SettingsEditorClient";

export default async function AdminSettingsPage() {
  const me = await getMe();
  if (!me?.user || !hasMinimumRole(me.user.role, "admin")) {
    redirect("/access-denied");
  }

  const settings = await listAdminSettings();

  return <SettingsEditorClient initialSettings={settings} />;
}
