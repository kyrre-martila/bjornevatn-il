import { redirect } from "next/navigation";

import { listAdminRedirects } from "../../../../lib/admin/redirects";
import { getMe } from "../../../../lib/me";
import { canManageTaxonomies } from "../../../../lib/roles";
import { RedirectsAdminClient } from "./RedirectsAdminClient";

export default async function AdminRedirectsPage() {
  const me = await getMe();
  if (!canManageTaxonomies(me?.user?.role)) {
    redirect("/access-denied");
  }

  const redirects = await listAdminRedirects();

  return <RedirectsAdminClient initialRedirects={redirects} />;
}
