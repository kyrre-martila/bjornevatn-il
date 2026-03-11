import { PageEditorClient } from "../PageEditorClient";
import { getMe } from "../../../../../lib/me";
import { hasMinimumRole } from "../../../../../lib/rbac";

export default async function NewAdminPage() {
  const me = await getMe();
  return (
    <PageEditorClient
      initialPage={null}
      canManageStructure={hasMinimumRole(me?.user?.role, "admin")}
    />
  );
}
