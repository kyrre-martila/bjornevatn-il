import { redirect } from "next/navigation";

import { getMe } from "../../../../lib/me";
import { canManageUsers } from "../../../../lib/roles";
import { listAdminSettings } from "../../../../lib/admin/settings";
import { SettingsEditorClient } from "./SettingsEditorClient";

export default async function AdminSettingsPage() {
  const me = await getMe();
  if (!canManageUsers(me?.user?.role)) {
    redirect("/access-denied");
  }

  const settings = await listAdminSettings();

  return <SettingsEditorClient initialSettings={settings} />;
}
