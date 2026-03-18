import Link from "next/link";
import { redirect } from "next/navigation";

import {
  listAdminClubhouseBookings,
  type BookingStatus,
  type BookingTimeframe,
} from "../../../../lib/admin/clubhouse";
import { getMe } from "../../../../lib/me";
import { canManageUsers } from "../../../../lib/roles";
import { AdminEmptyState } from "../components/AdminEmptyState";
import { AdminFiltersBar } from "../components/AdminFiltersBar";
import { AdminPageHeader } from "../components/AdminPageHeader";
import { AdminPagination } from "../components/AdminPagination";
import { AdminSectionCard } from "../components/AdminSectionCard";
import { AdminStatusBadge } from "../components/AdminStatusBadge";

export default async function AdminClubhouseBookingsPage({
  searchParams,
}: {
  searchParams?: {
    status?: string;
    timeframe?: string;
    page?: string;
    pageSize?: string;
  };
}) {
  const me = await getMe();
  if (!canManageUsers(me?.user?.role)) {
    redirect("/access-denied");
  }

  const status = (
    ["pending", "approved", "rejected", "cancelled"].includes(
      searchParams?.status ?? "",
    )
      ? searchParams?.status
      : ""
  ) as BookingStatus | "";
  const timeframe = (
    ["all", "upcoming", "past"].includes(searchParams?.timeframe ?? "")
      ? searchParams?.timeframe
      : "upcoming"
  ) as BookingTimeframe;

  const page = Math.max(1, Number(searchParams?.page ?? "1") || 1);
  const pageSize = Math.min(
    100,
    Math.max(10, Number(searchParams?.pageSize ?? "25") || 25),
  );

  const bookings = await listAdminClubhouseBookings({
    status: status || undefined,
    timeframe,
    page,
    pageSize,
  });

  const hasFilterResults = Boolean(status) || timeframe !== "upcoming";

  return (
    <section className="admin-list-page">
      <AdminPageHeader
        title="Clubhouse bookings"
        description="Review booking requests, manage approvals, and keep booking notes in one consistent workflow."
      />

      <AdminSectionCard title="Filters" description="Refine the list by booking status or time range.">
        <AdminFiltersBar
          method="get"
          actions={
            <>
              <input type="hidden" name="page" value="1" />
              <input type="hidden" name="pageSize" value={String(pageSize)} />
              <button type="submit" className="button-primary">
                Apply filters
              </button>
            </>
          }
        >
          <label className="admin-filters-bar__field">
            <span>Status</span>
            <select name="status" defaultValue={status}>
              <option value="">All statuses</option>
              <option value="pending">Pending review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <label className="admin-filters-bar__field">
            <span>Time range</span>
            <select name="timeframe" defaultValue={timeframe}>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
              <option value="all">All bookings</option>
            </select>
          </label>
        </AdminFiltersBar>
      </AdminSectionCard>

      <AdminSectionCard
        title="Results"
        description="Each booking shows the requester, schedule, purpose, and current review state."
      >
        {bookings.items.length === 0 ? (
          <AdminEmptyState
            title={
              hasFilterResults
                ? "No bookings match these filters"
                : "No bookings to review"
            }
            description={
              hasFilterResults
                ? "Try clearing one or more filters to see more booking requests."
                : "New clubhouse booking requests will appear here as soon as someone submits one."
            }
          />
        ) : (
          <ul className="admin-card-list" aria-label="Clubhouse bookings">
            {bookings.items.map((booking) => (
              <li key={booking.id} className="admin-card-list__item">
                <div className="admin-card-list__row">
                  <div>
                    <h2 className="admin-card-list__title">{booking.bookedByName}</h2>
                    <p className="admin-card-list__meta">{booking.bookedByEmail}</p>
                  </div>
                  <AdminStatusBadge context="booking" value={booking.status} />
                </div>
                <dl className="admin-key-value-list">
                  <div>
                    <dt>Booking window</dt>
                    <dd>
                      {new Date(booking.startAt).toLocaleString()} →{" "}
                      {new Date(booking.endAt).toLocaleString()}
                    </dd>
                  </div>
                  <div>
                    <dt>Purpose</dt>
                    <dd>{booking.purpose}</dd>
                  </div>
                  <div>
                    <dt>Attendees</dt>
                    <dd>{booking.attendeeCount ?? "-"}</dd>
                  </div>
                  <div>
                    <dt>Requested</dt>
                    <dd>{new Date(booking.createdAt).toLocaleString()}</dd>
                  </div>
                </dl>
                <div className="admin-inline-actions">
                  <Link href={`/admin/clubhouse-bookings/${booking.id}`}>View details</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AdminSectionCard>

      <AdminPagination
        page={bookings.pagination.page}
        totalPages={bookings.pagination.totalPages}
        total={bookings.pagination.total}
        basePath="/admin/clubhouse-bookings"
        query={{
          status: status || undefined,
          timeframe,
          pageSize: String(pageSize),
        }}
        ariaLabel="Clubhouse booking pages"
      />
    </section>
  );
}
