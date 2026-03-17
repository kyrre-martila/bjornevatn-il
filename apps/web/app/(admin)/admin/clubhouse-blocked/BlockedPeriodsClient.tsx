"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { AdminBlockedPeriod } from "../../../../lib/admin/clubhouse";

type FormState = { startAt: string; endAt: string; reason: string };
const EMPTY_FORM: FormState = { startAt: "", endAt: "", reason: "" };

export default function BlockedPeriodsClient({ periods }: { periods: AdminBlockedPeriod[] }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const endpoint = editingId
      ? `/api/admin/clubhouse/blocked-periods/${editingId}`
      : "/api/admin/clubhouse/blocked-periods";
    const method = editingId ? "PATCH" : "POST";

    const res = await fetch(endpoint, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setError((data && (data.message || data.error)) || "Failed to save blocked period.");
      return;
    }

    setForm(EMPTY_FORM);
    setEditingId(null);
    router.refresh();
  }

  async function deletePeriod(id: string) {
    const res = await fetch(`/api/admin/clubhouse/blocked-periods/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Failed to delete blocked period.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="admin-blocked">
      <form className="admin-blocked__form" onSubmit={onSubmit}>
        <label>Start<input type="datetime-local" value={form.startAt} onChange={(e) => setForm((p) => ({ ...p, startAt: e.target.value }))} required /></label>
        <label>End<input type="datetime-local" value={form.endAt} onChange={(e) => setForm((p) => ({ ...p, endAt: e.target.value }))} required /></label>
        <label>Reason<input value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} required /></label>
        <button type="submit" className="button-primary">{editingId ? "Update" : "Create"} blocked period</button>
        {error ? <p className="admin-blocked__error">{error}</p> : null}
      </form>

      <ul className="admin-blocked__list">
        {periods.map((period) => (
          <li key={period.id} className="admin-blocked__item">
            <p>{new Date(period.startAt).toLocaleString()} → {new Date(period.endAt).toLocaleString()}</p>
            <p>{period.reason}</p>
            <div>
              <button type="button" onClick={() => {
                setEditingId(period.id);
                setForm({
                  startAt: period.startAt.slice(0, 16),
                  endAt: period.endAt.slice(0, 16),
                  reason: period.reason,
                });
              }}>Edit</button>
              <button type="button" onClick={() => void deletePeriod(period.id)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
