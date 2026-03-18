import Link from "next/link";
import { redirect } from "next/navigation";

import {
  listAdminMembershipApplications,
  listAdminMembershipCategories,
  type MembershipApplicationStatus,
} from "../../../../lib/admin/memberships";
import { getMe } from "../../../../lib/me";
import { canManageUsers } from "../../../../lib/roles";
import { AdminEmptyState } from "../components/AdminEmptyState";
import { AdminFiltersBar } from "../components/AdminFiltersBar";
import { AdminPageHeader } from "../components/AdminPageHeader";
import { AdminPagination } from "../components/AdminPagination";
import { AdminSectionCard } from "../components/AdminSectionCard";
import { AdminStatusBadge } from "../components/AdminStatusBadge";

const statuses: MembershipApplicationStatus[] = [
  "new",
  "contacted",
  "approved",
  "rejected",
  "archived",
];

export default async function AdminMembershipApplicationsPage({
  searchParams,
}: {
  searchParams?: {
    status?: string;
    membershipCategoryId?: string;
    page?: string;
    pageSize?: string;
  };
}) {
  const me = await getMe();
  if (!canManageUsers(me?.user?.role)) redirect("/access-denied");

  const status = (
    statuses.includes((searchParams?.status ?? "") as MembershipApplicationStatus)
      ? searchParams?.status
      : ""
  ) as MembershipApplicationStatus | "";
  const membershipCategoryId = searchParams?.membershipCategoryId ?? "";

  const page = Math.max(1, Number(searchParams?.page ?? "1") || 1);
  const pageSize = Math.min(
    100,
    Math.max(10, Number(searchParams?.pageSize ?? "25") || 25),
  );

  const [applications, categories] = await Promise.all([
    listAdminMembershipApplications({
      status: status || undefined,
      membershipCategoryId: membershipCategoryId || undefined,
      page,
      pageSize,
    }),
    listAdminMembershipCategories(),
  ]);

  const hasActiveFilters = Boolean(status || membershipCategoryId);

  return (
    <section className="admin-list-page">
      <AdminPageHeader
        title="Membership applications"
        description="Review new applicants, update their progress, and keep notes consistent across the membership workflow."
      />

      <AdminSectionCard title="Filters" description="Use status and category filters to narrow the list.">
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
              {statuses.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-filters-bar__field">
            <span>Membership category</span>
            <select name="membershipCategoryId" defaultValue={membershipCategoryId}>
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        </AdminFiltersBar>
      </AdminSectionCard>

      <AdminSectionCard
        title="Applications"
        description="Applications use a shared table pattern with summary data, status badges, and a clear open action."
      >
        {applications.items.length === 0 ? (
          <AdminEmptyState
            title={
              hasActiveFilters
                ? "No applications match these filters"
                : "No membership applications yet"
            }
            description={
              hasActiveFilters
                ? "Clear one or more filters to broaden the results."
                : "New membership applications will appear here after someone submits the public application form."
            }
          />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-results-table">
              <thead>
                <tr>
                  <th scope="col">Applicant</th>
                  <th scope="col">Contact</th>
                  <th scope="col">Category</th>
                  <th scope="col">Submitted</th>
                  <th scope="col">Status</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {applications.items.map((application) => (
                  <tr key={application.id}>
                    <td data-label="Applicant">{application.fullName}</td>
                    <td data-label="Contact">
                      <div className="admin-table-cell-stack">
                        <span>{application.email}</span>
                        <span>{application.phone || "-"}</span>
                      </div>
                    </td>
                    <td data-label="Category">{application.membershipCategory.name}</td>
                    <td data-label="Submitted">{new Date(application.createdAt).toLocaleString()}</td>
                    <td data-label="Status">
                      <AdminStatusBadge context="membership" value={application.status} />
                    </td>
                    <td data-label="Action">
                      <Link href={`/admin/memberships/${application.id}`}>Open application</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSectionCard>

      <AdminPagination
        page={applications.pagination.page}
        totalPages={applications.pagination.totalPages}
        total={applications.pagination.total}
        basePath="/admin/memberships"
        query={{
          status: status || undefined,
          membershipCategoryId: membershipCategoryId || undefined,
          pageSize: String(pageSize),
        }}
        ariaLabel="Membership application pages"
      />
    </section>
  );
}
