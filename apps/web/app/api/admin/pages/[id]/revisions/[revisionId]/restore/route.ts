import { requireMinimumAdminRole } from "../../../../../auth";
import { proxyAdminJson } from "../../../../../upstream";

type Params = { params: Promise<{ id: string; revisionId: string }> };

export async function POST(request: Request, { params }: Params) {
  const denied = await requireMinimumAdminRole("admin");
  if (denied) return denied;

  const { id, revisionId } = await params;
  return proxyAdminJson(
    `/admin/content/pages/${encodeURIComponent(id)}/revisions/${encodeURIComponent(revisionId)}/restore`,
    {
      method: "POST",
      request,
      errorMessage: "Failed to restore page revision",
    },
  );
}
