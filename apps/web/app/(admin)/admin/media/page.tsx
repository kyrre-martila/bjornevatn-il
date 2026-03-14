import { redirect } from "next/navigation";

import { getMe } from "../../../../lib/me";
import { hasMinimumRole } from "../../../../lib/rbac";
import { MediaManagerClient } from "./MediaManagerClient";
import { listAdminMedia } from "../../../../lib/admin/media";

export default async function AdminMediaPage() {
  const me = await getMe();
  if (!me?.user || !hasMinimumRole(me.user.role, "editor")) {
    redirect("/access-denied");
  }

  const pageSize = 50;
  const media = await listAdminMedia({ limit: pageSize + 1, offset: 0 });

  return (
    <MediaManagerClient
      initialMedia={media.slice(0, pageSize)}
      pageSize={pageSize}
      initialHasNext={media.length > pageSize}
    />
  );
}
