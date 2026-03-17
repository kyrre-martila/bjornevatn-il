import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { canManageUsers } from "../../../../../lib/roles";
import { getMe } from "../../../../../lib/me";
import { getAdminClubhouseBooking } from "../../../../../lib/admin/clubhouse";
import BookingDetailClient from "./BookingDetailClient";

export default async function AdminClubhouseBookingDetailPage({ params }: { params: { id: string } }) {
  const me = await getMe();
  if (!canManageUsers(me?.user?.role)) redirect("/access-denied");

  const booking = await getAdminClubhouseBooking(params.id);
  if (!booking) notFound();

  return (
    <section className="admin-booking-detail" aria-labelledby="clubhouse-booking-detail-heading">
      <div className="admin-booking-detail__header">
        <p className="hero__eyebrow">Admin</p>
        <h1 id="clubhouse-booking-detail-heading" className="hero__title">Booking details</h1>
        <p><Link href="/admin/clubhouse-bookings">← Back to bookings</Link></p>
      </div>

      <dl className="admin-booking-detail__info">
        <dt>Name</dt><dd>{booking.bookedByName}</dd>
        <dt>Email</dt><dd>{booking.bookedByEmail}</dd>
        <dt>Phone</dt><dd>{booking.bookedByPhone}</dd>
        <dt>Organization</dt><dd>{booking.organization ?? "-"}</dd>
        <dt>Purpose</dt><dd>{booking.purpose}</dd>
        <dt>Attendee count</dt><dd>{booking.attendeeCount ?? "-"}</dd>
        <dt>Start</dt><dd>{new Date(booking.startAt).toLocaleString()}</dd>
        <dt>End</dt><dd>{new Date(booking.endAt).toLocaleString()}</dd>
        <dt>Status</dt><dd>{booking.status}</dd>
        <dt>Created</dt><dd>{new Date(booking.createdAt).toLocaleString()}</dd>
      </dl>

      <BookingDetailClient booking={booking} />
    </section>
  );
}
