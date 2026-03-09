import { notFound } from "next/navigation";
import { PageEditorClient } from "../PageEditorClient";
import { getAdminPage } from "../../../../../lib/admin/pages";

export default async function EditAdminPage({ params }: { params: { id: string } }) {
  const page = await getAdminPage(params.id);

  if (!page) {
    notFound();
  }

  return <PageEditorClient initialPage={page} />;
}
