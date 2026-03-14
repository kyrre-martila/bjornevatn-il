import { notFound } from "next/navigation";
import { PageEditorClient } from "../PageEditorClient";
import { getAdminPage } from "../../../../../lib/admin/pages";
import { getMe } from "../../../../../lib/me";
import { hasMinimumRole, hasRole } from "../../../../../lib/rbac";

export default async function EditAdminPage({ params }: { params: { id: string } }) {
  const me = await getMe();
  const page = await getAdminPage(params.id);

  if (!page) {
    notFound();
  }

  return (
    <PageEditorClient
      initialPage={page}
      canManageStructure={hasMinimumRole(me?.user?.role, "admin")}
      canEditRawJson={hasRole(me?.user?.role, "super_admin")}
    />
  );
}
