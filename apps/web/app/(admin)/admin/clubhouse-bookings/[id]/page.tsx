import { notFound, redirect } from "next/navigation";

import { getAdminClubhouseBooking } from "../../../../../lib/admin/clubhouse";
import { getMe } from "../../../../../lib/me";
import { canManageUsers } from "../../../../../lib/roles";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { AdminSectionCard } from "../../components/AdminSectionCard";
import { AdminStatusBadge } from "../../components/AdminStatusBadge";
import BookingDetailClient from "./BookingDetailClient";

export default async function AdminClubhouseBookingDetailPage({ params }: { params: { id: string } }) {
  const me = await getMe();
  if (!canManageUsers(me?.user?.role)) redirect("/access-denied");

  const booking = await getAdminClubhouseBooking(params.id);
  if (!booking) notFound();

  return (
    <section className="admin-detail-page">
      <AdminPageHeader
        title="Booking details"
        description="Review requester details, booking timing, and the latest internal notes before updating the request."
        backHref="/admin/clubhouse-bookings"
        backLabel="← Back to clubhouse bookings"
        actions={<AdminStatusBadge context="booking" value={booking.status} />}
      />

      <div className="admin-detail-page__grid">
        <AdminSectionCard title="Booking summary" description="Key request details shown in a predictable summary card.">
          <dl className="admin-detail-grid">
            <div><dt>Name</dt><dd>{booking.bookedByName}</dd></div>
            <div><dt>Email</dt><dd>{booking.bookedByEmail}</dd></div>
            <div><dt>Phone</dt><dd>{booking.bookedByPhone}</dd></div>
            <div><dt>Organisation</dt><dd>{booking.organization ?? "-"}</dd></div>
            <div><dt>Purpose</dt><dd>{booking.purpose}</dd></div>
            <div><dt>Attendee count</dt><dd>{booking.attendeeCount ?? "-"}</dd></div>
          </dl>
        </AdminSectionCard>

        <AdminSectionCard title="Timeline and status" description="Timing, request creation, and the current moderation status.">
          <dl className="admin-detail-grid">
            <div><dt>Start</dt><dd>{new Date(booking.startAt).toLocaleString()}</dd></div>
            <div><dt>End</dt><dd>{new Date(booking.endAt).toLocaleString()}</dd></div>
            <div><dt>Created</dt><dd>{new Date(booking.createdAt).toLocaleString()}</dd></div>
            <div><dt>Updated</dt><dd>{new Date(booking.updatedAt).toLocaleString()}</dd></div>
            <div><dt>Status</dt><dd><AdminStatusBadge context="booking" value={booking.status} /></dd></div>
          </dl>
        </AdminSectionCard>
      </div>

      <AdminSectionCard title="Admin actions" description="Save internal notes first, then use the action buttons to update the booking status.">
        <BookingDetailClient booking={booking} />
      </AdminSectionCard>
    </section>
  );
}
