import { redirect } from "next/navigation";

import { getMe } from "../../../../lib/me";
import { hasMinimumRole } from "../../../../lib/rbac";
import { listAdminNavigationItems } from "../../../../lib/admin/navigation";
import { NavigationEditorClient } from "./NavigationEditorClient";

export default async function AdminNavigationPage() {
  const me = await getMe();
  if (!me?.user || !hasMinimumRole(me.user.role, "admin")) {
    redirect("/admin");
  }

  const items = await listAdminNavigationItems();

  return <NavigationEditorClient initialItems={items} />;
}
