import Link from "next/link";
import { redirect } from "next/navigation";

import { listAdminClubhouseBookings, type BookingStatus, type BookingTimeframe } from "../../../../lib/admin/clubhouse";
import { canManageUsers } from "../../../../lib/roles";
import { getMe } from "../../../../lib/me";

export default async function AdminClubhouseBookingsPage({
  searchParams,
}: {
  searchParams?: { status?: string; timeframe?: string; page?: string; pageSize?: string };
}) {
  const me = await getMe();
  if (!canManageUsers(me?.user?.role)) {
    redirect("/access-denied");
  }

  const status = (["pending", "approved", "rejected", "cancelled"].includes(searchParams?.status ?? "")
    ? searchParams?.status
    : "") as BookingStatus | "";
  const timeframe = (["all", "upcoming", "past"].includes(searchParams?.timeframe ?? "")
    ? searchParams?.timeframe
    : "upcoming") as BookingTimeframe;

  const page = Math.max(1, Number(searchParams?.page ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(10, Number(searchParams?.pageSize ?? "25") || 25));

  const bookings = await listAdminClubhouseBookings({
    status: status || undefined,
    timeframe,
    page,
    pageSize,
  });

  return (
    <section className="admin-bookings" aria-labelledby="clubhouse-bookings-heading">
      <div className="admin-bookings__header">
        <div>
          <p className="hero__eyebrow">Admin</p>
          <h1 id="clubhouse-bookings-heading" className="hero__title">Clubhouse bookings</h1>
        </div>
      </div>

      <form className="admin-bookings__filters" method="get">
        <label>
          Status
          <select name="status" defaultValue={status}>
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <label>
          Time
          <select name="timeframe" defaultValue={timeframe}>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
            <option value="all">All</option>
          </select>
        </label>
        <input type="hidden" name="page" value="1" />
        <input type="hidden" name="pageSize" value={String(pageSize)} />
        <button type="submit" className="button-primary">Apply</button>
      </form>

      <ul className="admin-bookings__list">
        {bookings.items.map((booking) => (
          <li key={booking.id} className="admin-bookings__item">
            <p><strong>{booking.bookedByName}</strong> ({booking.bookedByEmail})</p>
            <p>{new Date(booking.startAt).toLocaleString()} → {new Date(booking.endAt).toLocaleString()}</p>
            <p>Purpose: {booking.purpose}</p>
            <p>Attendees: {booking.attendeeCount ?? "-"}</p>
            <p>Status: <span className={`admin-bookings__status admin-bookings__status--${booking.status}`}>{booking.status}</span></p>
            <p>Requested: {new Date(booking.createdAt).toLocaleString()}</p>
            <Link href={`/admin/clubhouse-bookings/${booking.id}`}>View details</Link>
          </li>
        ))}
      </ul>

      <p>Page {bookings.pagination.page} of {bookings.pagination.totalPages} ({bookings.pagination.total} total)</p>
    </section>
  );
}
