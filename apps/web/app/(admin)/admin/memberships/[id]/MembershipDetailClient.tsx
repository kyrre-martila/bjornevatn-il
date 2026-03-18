"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type {
  AdminMembershipApplication,
  MembershipApplicationStatus,
} from "../../../../../lib/admin/memberships";

const statuses: MembershipApplicationStatus[] = [
  "new",
  "contacted",
  "approved",
  "rejected",
  "archived",
];

export default function MembershipDetailClient({ application }: { application: AdminMembershipApplication }) {
  const router = useRouter();
  const [status, setStatus] = useState<MembershipApplicationStatus>(application.status);
  const [adminNotes, setAdminNotes] = useState(application.adminNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    setState(null);

    const response = await fetch(`/api/admin/memberships/${application.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, adminNotes }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError((payload && (payload.message || payload.error)) || "Failed to update application.");
      setSaving(false);
      return;
    }

    setState("Membership application updated.");
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="admin-form-panel">
      <div className="admin-form-panel__grid">
        <label className="admin-form-panel__field">
          <span>Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as MembershipApplicationStatus)}
          >
            {statuses.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-form-panel__field admin-form-panel__field--full">
          <span>Admin notes</span>
          <textarea
            rows={5}
            value={adminNotes}
            onChange={(event) => setAdminNotes(event.target.value)}
          />
        </label>
      </div>

      {error ? <p className="admin-form-feedback admin-form-feedback--error">{error}</p> : null}
      {state ? <p className="admin-form-feedback admin-form-feedback--success">{state}</p> : null}

      <div className="admin-form-actions">
        <button type="button" className="button-primary" disabled={saving} onClick={save}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </div>
  );
}
