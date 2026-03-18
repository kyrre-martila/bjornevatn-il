import { cookies } from "next/headers";
import { getServerApiBaseUrl } from "../api-config";

export type MembershipApplicationStatus =
  | "new"
  | "contacted"
  | "approved"
  | "rejected"
  | "archived";

export type AdminMembershipCategory = {
  id: string;
  name: string;
  slug: string;
};

export type AdminMembershipApplication = {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  addressLine?: string | null;
  postalCode?: string | null;
  city?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  guardianEmail?: string | null;
  notes?: string | null;
  adminNotes?: string | null;
  status: MembershipApplicationStatus;
  createdAt: string;
  updatedAt: string;
  membershipCategory: AdminMembershipCategory;
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

export type AdminMembershipCategoryFilter = {
  id: string;
  name: string;
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

export async function listAdminMembershipApplications(filters: {
  status?: MembershipApplicationStatus;
  membershipCategoryId?: string;
  page?: number;
  pageSize?: number;
}): Promise<AdminPaginatedResponse<AdminMembershipApplication>> {
  const query = new URLSearchParams();
  if (filters.status) query.set("status", filters.status);
  if (filters.membershipCategoryId)
    query.set("membershipCategoryId", filters.membershipCategoryId);
  if (filters.page) query.set("page", String(filters.page));
  if (filters.pageSize) query.set("pageSize", String(filters.pageSize));

  const response = await fetch(
    `${getApiBase()}/membership/admin/applications?${query.toString()}`,
    {
      headers: buildHeaders(),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return {
      items: [],
      pagination: {
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? 25,
        total: 0,
        totalPages: 1,
      },
    };
  }
  return (await response.json()) as AdminPaginatedResponse<AdminMembershipApplication>;
}

export async function getAdminMembershipApplication(
  id: string,
): Promise<AdminMembershipApplication | null> {
  const response = await fetch(
    `${getApiBase()}/membership/admin/applications/${id}`,
    {
      headers: buildHeaders(),
      cache: "no-store",
    },
  );

  if (!response.ok) return null;
  return (await response.json()) as AdminMembershipApplication;
}

export async function listAdminMembershipCategories(): Promise<
  AdminMembershipCategoryFilter[]
> {
  const response = await fetch(`${getApiBase()}/membership/admin/categories`, {
    headers: buildHeaders(),
    cache: "no-store",
  });

  if (!response.ok) return [];
  return (await response.json()) as AdminMembershipCategoryFilter[];
}
