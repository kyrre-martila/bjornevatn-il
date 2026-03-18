import { cookies } from "next/headers";
import { getServerApiBaseUrl } from "../api-config";

export type BookingStatus = "pending" | "approved" | "rejected" | "cancelled";
export type BookingTimeframe = "all" | "upcoming" | "past";

export type AdminClubhouseBooking = {
  id: string;
  bookedByName: string;
  bookedByEmail: string;
  bookedByPhone: string;
  organization?: string;
  purpose: string;
  attendeeCount?: number;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
export type AdminPaginatedResponse<T> = {
  items: T[];
  pagination: AdminPagination;
  filters?: Record<string, unknown>;
};

export type AdminBlockedPeriod = {
  id: string;
  startAt: string;
  endAt: string;
  reason: string;
  createdAt: string;
  updatedAt: string;
};

function getApiBase() {
  return getServerApiBaseUrl();
}

function buildHeaders() {
  const cookieHeader = cookies().toString();
  const headers: Record<string, string> = {};
  if (cookieHeader) headers.cookie = cookieHeader;
  return headers;
}

export async function listAdminClubhouseBookings(filters: {
  status?: BookingStatus;
  timeframe?: BookingTimeframe;
  page?: number;
  pageSize?: number;
}): Promise<AdminPaginatedResponse<AdminClubhouseBooking>> {
  const query = new URLSearchParams();
  if (filters.status) query.set("status", filters.status);
  if (filters.timeframe && filters.timeframe !== "all")
    query.set("timeframe", filters.timeframe);
  if (filters.page) query.set("page", String(filters.page));
  if (filters.pageSize) query.set("pageSize", String(filters.pageSize));

  const response = await fetch(
    `${getApiBase()}/clubhouse/admin/bookings?${query.toString()}`,
    {
      headers: buildHeaders(),
      cache: "no-store",
    },
  );

  if (!response.ok)
    return {
      items: [],
      pagination: {
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? 25,
        total: 0,
        totalPages: 1,
      },
    };
  return (await response.json()) as AdminPaginatedResponse<AdminClubhouseBooking>;
}

export async function getAdminClubhouseBooking(
  id: string,
): Promise<AdminClubhouseBooking | null> {
  const response = await fetch(
    `${getApiBase()}/clubhouse/admin/bookings/${id}`,
    {
      headers: buildHeaders(),
      cache: "no-store",
    },
  );

  if (!response.ok) return null;
  return (await response.json()) as AdminClubhouseBooking;
}

export async function listAdminBlockedPeriods(): Promise<AdminBlockedPeriod[]> {
  const response = await fetch(
    `${getApiBase()}/clubhouse/admin/blocked-periods`,
    {
      headers: buildHeaders(),
      cache: "no-store",
    },
  );

  if (!response.ok) return [];
  return (await response.json()) as AdminBlockedPeriod[];
}
