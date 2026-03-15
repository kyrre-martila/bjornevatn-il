import Link from "next/link";
import { redirect } from "next/navigation";

import { listAdminAuditLogs } from "../../../../lib/admin/audit-logs";
import { getMe } from "../../../../lib/me";
import { canManageUsers } from "../../../../lib/roles";

type PageProps = {
  searchParams?: {
    userId?: string;
    action?: string;
    entityType?: string;
    limit?: string;
    offset?: string;
  };
};

export default async function AdminAuditPage({ searchParams }: PageProps) {
  const me = await getMe();
  if (!canManageUsers(me?.user?.role)) {
    redirect("/access-denied");
  }

  const filters = {
    userId: searchParams?.userId?.trim() || undefined,
    action: searchParams?.action?.trim() || undefined,
    entityType: searchParams?.entityType?.trim() || undefined,
    limit: Number(searchParams?.limit),
    offset: Number(searchParams?.offset),
  };

  const logs = await listAdminAuditLogs(filters);

  const prevParams = new URLSearchParams();
  const nextParams = new URLSearchParams();
  if (filters.userId) {
    prevParams.set("userId", filters.userId);
    nextParams.set("userId", filters.userId);
  }
  if (filters.action) {
    prevParams.set("action", filters.action);
    nextParams.set("action", filters.action);
  }
  if (filters.entityType) {
    prevParams.set("entityType", filters.entityType);
    nextParams.set("entityType", filters.entityType);
  }
  prevParams.set("limit", String(logs.pagination.limit));
  nextParams.set("limit", String(logs.pagination.limit));
  prevParams.set(
    "offset",
    String(Math.max(0, logs.pagination.offset - logs.pagination.limit)),
  );
  nextParams.set("offset", String(logs.pagination.offset + logs.pagination.limit));

  return (
    <section className="admin-pages" aria-labelledby="audit-heading">
      <div className="admin-pages__header">
        <div>
          <p className="hero__eyebrow">Admin</p>
          <h1 id="audit-heading" className="hero__title">
            Audit log
          </h1>
          <p className="admin-pages__summary">
            Read-only history of sensitive admin actions.
          </p>
        </div>
      </div>

      <form
        method="get"
        className="admin-pages__help"
        style={{ display: "grid", gap: 8, marginBottom: 16 }}
      >
        <label>
          User ID
          <input
            name="userId"
            defaultValue={filters.userId ?? ""}
            className="admin-input"
          />
        </label>
        <label>
          Action
          <input
            name="action"
            defaultValue={filters.action ?? ""}
            className="admin-input"
          />
        </label>
        <label>
          Entity type
          <input
            name="entityType"
            defaultValue={filters.entityType ?? ""}
            className="admin-input"
          />
        </label>
        <input type="hidden" name="limit" value={String(logs.pagination.limit)} />
        <input type="hidden" name="offset" value="0" />
        <button
          type="submit"
          className="btn btn--secondary"
          style={{ width: "fit-content" }}
        >
          Apply filters
        </button>
      </form>

      <div className="page-editor__actions" style={{ justifyContent: "space-between" }}>
        <span>
          Showing {logs.items.length === 0 ? 0 : logs.pagination.offset + 1}-{logs.pagination.offset + logs.items.length}
        </span>
        <div className="page-editor__actions">
          {logs.pagination.offset > 0 ? (
            <Link className="btn btn--secondary" href={`/admin/audit?${prevParams.toString()}`}>
              Previous
            </Link>
          ) : (
            <span className="btn btn--secondary" aria-disabled="true">
              Previous
            </span>
          )}
          {logs.items.length >= logs.pagination.limit ? (
            <Link className="btn btn--secondary" href={`/admin/audit?${nextParams.toString()}`}>
              Next
            </Link>
          ) : (
            <span className="btn btn--secondary" aria-disabled="true">
              Next
            </span>
          )}
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>User</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Entity ID</th>
              <th>Metadata</th>
            </tr>
          </thead>
          <tbody>
            {logs.items.map((log) => (
              <tr key={log.id}>
                <td>{new Date(log.createdAt).toLocaleString()}</td>
                <td>{log.user?.email ?? log.userId ?? "system"}</td>
                <td>{log.action}</td>
                <td>{log.entityType}</td>
                <td>{log.entityId ?? "-"}</td>
                <td>
                  <code>
                    {log.metadata ? JSON.stringify(log.metadata) : "-"}
                  </code>
                </td>
              </tr>
            ))}
            {logs.items.length === 0 ? (
              <tr>
                <td colSpan={6}>No audit entries found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
