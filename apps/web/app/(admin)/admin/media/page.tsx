import { redirect } from "next/navigation";

import { getMe } from "../../../../lib/me";
import { hasMinimumRole } from "../../../../lib/rbac";
import { canManageTaxonomies } from "../../../../lib/roles";
import { MediaManagerClient } from "./MediaManagerClient";
import { listAdminMedia } from "../../../../lib/admin/media";

export default async function AdminMediaPage() {
  const me = await getMe();
  if (!me?.user || !hasMinimumRole(me.user.role, "editor")) {
    redirect("/access-denied");
  }

  const pageSize = 50;
  const media = await listAdminMedia({ page: 1, pageSize });

  return (
    <MediaManagerClient
      initialMedia={media.items}
      pageSize={pageSize}
      initialPagination={media.pagination}
      canDeleteMedia={canManageTaxonomies(me?.user?.role)}
    />
  );
}
