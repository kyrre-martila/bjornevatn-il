"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { AdminClubhouseBooking } from "../../../../../lib/admin/clubhouse";

export default function BookingDetailClient({ booking }: { booking: AdminClubhouseBooking }) {
  const router = useRouter();
  const [notes, setNotes] = useState(booking.adminNotes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function saveNotes() {
    setSaving(true);
    setError(null);
    setStatus(null);

    const res = await fetch(`/api/admin/clubhouse/bookings/${booking.id}/admin-notes`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ adminNotes: notes }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError((data && (data.message || data.error)) || "Failed to save notes.");
      setSaving(false);
      return;
    }

    setStatus("Notes updated.");
    setSaving(false);
    router.refresh();
  }

  async function changeStatus(next: "approve" | "reject" | "cancel") {
    setSaving(true);
    setError(null);
    setStatus(null);

    const res = await fetch(`/api/admin/clubhouse/bookings/${booking.id}/${next}`, { method: "POST" });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const message = data && (data.message || data.error);
      setError(typeof message === "string" ? message : "Failed to update status.");
      setSaving(false);
      return;
    }

    setStatus(`Booking ${next}d.`);
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="admin-booking-detail__actions">
      <label className="admin-booking-detail__notes">
        Admin notes
        <textarea rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </label>
      <button type="button" className="button-primary" onClick={saveNotes} disabled={saving}>Save notes</button>

      <div className="admin-booking-detail__status-actions">
        <button type="button" onClick={() => changeStatus("approve")} disabled={saving}>Approve</button>
        <button type="button" onClick={() => changeStatus("reject")} disabled={saving}>Reject</button>
        <button type="button" onClick={() => changeStatus("cancel")} disabled={saving}>Cancel</button>
      </div>

      {error ? <p className="admin-booking-detail__error">{error}</p> : null}
      {status ? <p className="admin-booking-detail__status">{status}</p> : null}
    </div>
  );
}
