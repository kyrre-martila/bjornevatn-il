import { redirect } from "next/navigation";
import { PageEditorClient } from "../PageEditorClient";
import { getMe } from "../../../../../lib/me";
import { hasMinimumRole, hasRole } from "../../../../../lib/rbac";

export default async function NewAdminPage() {
  const me = await getMe();
  if (!hasMinimumRole(me?.user?.role, "admin")) {
    redirect("/access-denied");
  }

  return (
    <PageEditorClient
      initialPage={null}
      canManageStructure={hasMinimumRole(me?.user?.role, "admin")}
      canEditRawJson={hasRole(me?.user?.role, "super_admin")}
    />
  );
}
