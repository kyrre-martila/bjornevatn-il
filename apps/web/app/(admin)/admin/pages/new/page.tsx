import { redirect } from "next/navigation";
import { PageEditorClient } from "../PageEditorClient";
import { getMe } from "../../../../../lib/me";
import { canAccessSchema, canEditSlug } from "../../../../../lib/roles";
import { hasMinimumRole } from "../../../../../lib/rbac";

export default async function NewAdminPage() {
  const me = await getMe();
  if (!hasMinimumRole(me?.user?.role, "editor")) {
    redirect("/access-denied");
  }

  return (
    <PageEditorClient
      initialPage={null}
      canManageStructure={canEditSlug(me?.user?.role)}
      canEditSlug={canEditSlug(me?.user?.role)}
      canEditRawJson={canAccessSchema(me?.user?.role)}
    />
  );
}
