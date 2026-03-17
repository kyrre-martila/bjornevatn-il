import { notFound, redirect } from "next/navigation";
import { PageEditorClient } from "../PageEditorClient";
import { getAdminPage } from "../../../../../lib/admin/pages";
import { getMe } from "../../../../../lib/me";
import { canAccessSchema, canEditSlug } from "../../../../../lib/roles";
import { hasMinimumRole } from "../../../../../lib/rbac";

export default async function EditAdminPage({
  params,
}: {
  params: { id: string };
}) {
  const me = await getMe();
  if (!hasMinimumRole(me?.user?.role, "editor")) {
    redirect("/access-denied");
  }

  const page = await getAdminPage(params.id);

  if (!page) {
    notFound();
  }

  return (
    <PageEditorClient
      initialPage={page}
      canManageStructure={canEditSlug(me?.user?.role)}
      canEditSlug={canEditSlug(me?.user?.role)}
      canEditRawJson={canAccessSchema(me?.user?.role)}
      canDeletePage={canEditSlug(me?.user?.role)}
      userRole={
        hasMinimumRole(me?.user?.role, "super_admin")
          ? "super_admin"
          : hasMinimumRole(me?.user?.role, "admin")
            ? "admin"
            : "editor"
      }
    />
  );
}
