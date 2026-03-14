import { redirect } from "next/navigation";

import { getMe } from "../../../../lib/me";
import { canManageTaxonomies } from "../../../../lib/roles";
import { listAdminNavigationItems } from "../../../../lib/admin/navigation";
import { NavigationEditorClient } from "./NavigationEditorClient";

export default async function AdminNavigationPage() {
  const me = await getMe();
  if (!canManageTaxonomies(me?.user?.role)) {
    redirect("/access-denied");
  }

  const items = await listAdminNavigationItems();

  return <NavigationEditorClient initialItems={items} />;
}
