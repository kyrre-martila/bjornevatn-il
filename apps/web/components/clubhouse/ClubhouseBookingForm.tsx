"use client";

import { useState } from "react";
import BookingSuccessMessage from "./BookingSuccessMessage";

type BookingResponse = {
  id: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  createdAt: string;
};

type FieldErrors = Partial<Record<string, string>>;

function mapApiError(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "Could not submit booking. Please try again.";
  }

  const record = payload as { message?: string | string[] };
  if (Array.isArray(record.message)) {
    return record.message.join(" ");
  }

  return record.message || "Could not submit booking. Please try again.";
}

export default function ClubhouseBookingForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState<BookingResponse | null>(null);

  async function onSubmit(formData: FormData) {
    const attendeeCountRaw = formData.get("attendeeCount")?.toString().trim() || "";
    const body = {
      bookedByName: formData.get("bookedByName")?.toString().trim() || "",
      bookedByEmail: formData.get("bookedByEmail")?.toString().trim() || "",
      bookedByPhone: formData.get("bookedByPhone")?.toString().trim() || "",
      organization: formData.get("organization")?.toString().trim() || undefined,
      purpose: formData.get("purpose")?.toString().trim() || "",
      attendeeCount: attendeeCountRaw ? Number(attendeeCountRaw) : undefined,
      startAt: formData.get("startAt")?.toString() || "",
      endAt: formData.get("endAt")?.toString() || "",
    };

    const nextFieldErrors: FieldErrors = {};
    if (!body.bookedByName) nextFieldErrors.bookedByName = "Full name is required.";
    if (!body.bookedByEmail) nextFieldErrors.bookedByEmail = "Email is required.";
    if (!body.bookedByPhone) nextFieldErrors.bookedByPhone = "Phone is required.";
    if (!body.purpose) nextFieldErrors.purpose = "Purpose is required.";
    if (!body.startAt) nextFieldErrors.startAt = "Start date/time is required.";
    if (!body.endAt) nextFieldErrors.endAt = "End date/time is required.";

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    setPending(true);
    setError(null);
    setFieldErrors({});
    setSuccess(null);

    const res = await fetch("/api/clubhouse/bookings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      setError(mapApiError(payload));
      setPending(false);
      return;
    }

    setSuccess(payload as BookingResponse);
    setPending(false);
  }

  return (
    <section className="clubhouse-booking section" aria-labelledby="clubhouse-booking-title">
      <div className="container container--md stack stack--sm">
        <h2 id="clubhouse-booking-title">Rent the clubhouse</h2>
        <p className="clubhouse-booking__intro">
          Send a booking request below. We will review your request and follow up by email.
        </p>
        <form
          className="clubhouse-booking__form stack stack--sm"
          action={(formData) => {
            void onSubmit(formData);
          }}
        >
          <label className="clubhouse-booking__field">
            <span>Full name</span>
            <input name="bookedByName" type="text" required />
            {fieldErrors.bookedByName ? <small>{fieldErrors.bookedByName}</small> : null}
          </label>

          <label className="clubhouse-booking__field">
            <span>Email</span>
            <input name="bookedByEmail" type="email" required />
            {fieldErrors.bookedByEmail ? <small>{fieldErrors.bookedByEmail}</small> : null}
          </label>

          <label className="clubhouse-booking__field">
            <span>Phone</span>
            <input name="bookedByPhone" type="tel" required />
            {fieldErrors.bookedByPhone ? <small>{fieldErrors.bookedByPhone}</small> : null}
          </label>

          <label className="clubhouse-booking__field">
            <span>Organization (optional)</span>
            <input name="organization" type="text" />
          </label>

          <label className="clubhouse-booking__field">
            <span>Purpose</span>
            <textarea name="purpose" rows={4} required />
            {fieldErrors.purpose ? <small>{fieldErrors.purpose}</small> : null}
          </label>

          <label className="clubhouse-booking__field">
            <span>Attendee count (optional)</span>
            <input name="attendeeCount" type="number" min={1} />
          </label>

          <label className="clubhouse-booking__field">
            <span>Start date/time</span>
            <input name="startAt" type="datetime-local" required />
            {fieldErrors.startAt ? <small>{fieldErrors.startAt}</small> : null}
          </label>

          <label className="clubhouse-booking__field">
            <span>End date/time</span>
            <input name="endAt" type="datetime-local" required />
            {fieldErrors.endAt ? <small>{fieldErrors.endAt}</small> : null}
          </label>

          <button type="submit" className="button-primary" disabled={pending}>
            {pending ? "Submitting..." : "Submit booking request"}
          </button>
          {error ? <p className="clubhouse-booking__error">{error}</p> : null}
          {success ? <BookingSuccessMessage bookingId={success.id} /> : null}
        </form>
      </div>
    </section>
  );
}
