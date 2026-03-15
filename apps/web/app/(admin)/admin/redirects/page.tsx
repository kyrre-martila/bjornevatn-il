import { redirect } from "next/navigation";

import { listAdminRedirects } from "../../../../lib/admin/redirects";
import { getMe } from "../../../../lib/me";
import { canManageTaxonomies } from "../../../../lib/roles";
import { RedirectsAdminClient } from "./RedirectsAdminClient";

type PageProps = {
  searchParams?: {
    offset?: string;
    limit?: string;
  };
};

export default async function AdminRedirectsPage({ searchParams }: PageProps) {
  const me = await getMe();
  if (!canManageTaxonomies(me?.user?.role)) {
    redirect("/access-denied");
  }

  const offset = Number(searchParams?.offset);
  const limit = Number(searchParams?.limit);

  const redirects = await listAdminRedirects({
    offset: Number.isFinite(offset) ? offset : undefined,
    limit: Number.isFinite(limit) ? limit : undefined,
  });

  return (
    <RedirectsAdminClient
      initialRedirects={redirects.items}
      initialPagination={redirects.pagination}
    />
  );
}
