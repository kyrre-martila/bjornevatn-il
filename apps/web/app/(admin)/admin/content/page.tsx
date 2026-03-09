import { ContentAdminClient } from "./ContentAdminClient";
import { listAdminContentItems, listAdminContentTypes } from "../../../../lib/admin/content";

export default async function AdminContentPage() {
  const contentTypes = await listAdminContentTypes();
  const groupedItems = await Promise.all(
    contentTypes.map(async (type) => ({
      contentTypeId: type.id,
      items: await listAdminContentItems(type.id),
    })),
  );

  return <ContentAdminClient initialContentTypes={contentTypes} initialGroupedItems={groupedItems} />;
}
