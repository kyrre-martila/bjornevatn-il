import { getMe } from "../../../../lib/me";
import { canAccessSchema, canEditRelations, canEditSlug } from "../../../../lib/feature-guards";
import { hasMinimumRole } from "../../../../lib/rbac";
import { ContentAdminClient } from "./ContentAdminClient";
import {
  listAdminContentItems,
  listAdminContentTypes,
} from "../../../../lib/admin/content";

const EDITOR_AREAS: Record<string, string> = {
  services: "services",
  news: "news",
  team: "team",
};

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams?: { area?: string };
}) {
  const me = await getMe();
  const role = me?.user?.role ?? null;
  const canManageContentTypes = canAccessSchema(role);
  const canUseMediaLibrary = hasMinimumRole(role, "editor");

  const contentTypes = await listAdminContentTypes();
  const requestedArea = searchParams?.area?.toLowerCase() ?? "";
  const initialSelectedTypeSlug = EDITOR_AREAS[requestedArea] ?? undefined;
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
      canUseMediaLibrary={canUseMediaLibrary}
      canEditSlug={canEditSlug(role)}
      canEditRelations={canEditRelations(role)}
      initialSelectedTypeSlug={initialSelectedTypeSlug}
    />
  );
}
