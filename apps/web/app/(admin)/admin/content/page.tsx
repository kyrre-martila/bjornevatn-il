import { getMe } from "../../../../lib/me";
import { hasRole } from "../../../../lib/rbac";
import { ContentAdminClient } from "./ContentAdminClient";
import {
  listAdminContentItems,
  listAdminContentTypes,
} from "../../../../lib/admin/content";

export default async function AdminContentPage() {
  const me = await getMe();
  const canManageContentTypes = hasRole(me?.user?.role, "super_admin");

  const contentTypes = await listAdminContentTypes();
  const groupedItems = await Promise.all(
    contentTypes.map(async (type) => ({
      contentTypeId: type.id,
      items: await listAdminContentItems(type.id),
    })),
  );

  return (
    <ContentAdminClient
      canManageContentTypes={canManageContentTypes}
      initialContentTypes={contentTypes}
      initialGroupedItems={groupedItems}
    />
  );
}
