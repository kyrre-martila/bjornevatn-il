import { getMe } from "../../../../lib/me";
import {
  canAccessSchema,
  canEditSlug,
  canManageTaxonomies,
} from "../../../../lib/roles";
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

const PAGE_SIZE = 50;

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
  const initialSelectedType = initialSelectedTypeSlug
    ? contentTypes.find((type) => type.slug === initialSelectedTypeSlug)
    : contentTypes[0];

  const initialContentTypeId = initialSelectedType?.id ?? "";
  const initialItemBatch = initialContentTypeId
    ? await listAdminContentItems(initialContentTypeId, {
        limit: PAGE_SIZE + 1,
        offset: 0,
      })
    : [];

  return (
    <ContentAdminClient
      canManageContentTypes={canManageContentTypes}
      initialContentTypes={contentTypes}
      initialItems={initialItemBatch.slice(0, PAGE_SIZE)}
      initialContentTypeId={initialContentTypeId}
      initialHasNextPage={initialItemBatch.length > PAGE_SIZE}
      pageSize={PAGE_SIZE}
      canUseMediaLibrary={canUseMediaLibrary}
      canEditSlug={canEditSlug(role)}
      canEditRelations={canManageTaxonomies(role)}
      initialSelectedTypeSlug={initialSelectedTypeSlug}
      userRole={
        hasMinimumRole(role, "super_admin")
          ? "super_admin"
          : hasMinimumRole(role, "admin")
            ? "admin"
            : "editor"
      }
    />
  );
}
