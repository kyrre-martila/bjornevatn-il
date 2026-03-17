import Link from "next/link";
import { redirect } from "next/navigation";

import { listAdminMembershipApplications, listAdminMembershipCategories, type MembershipApplicationStatus } from "../../../../lib/admin/memberships";
import { canManageUsers } from "../../../../lib/roles";
import { getMe } from "../../../../lib/me";

const statuses: MembershipApplicationStatus[] = ["new", "contacted", "approved", "rejected", "archived"];

export default async function AdminMembershipApplicationsPage({
  searchParams,
}: {
  searchParams?: { status?: string; membershipCategoryId?: string };
}) {
  const me = await getMe();
  if (!canManageUsers(me?.user?.role)) redirect("/access-denied");

  const status = (statuses.includes((searchParams?.status ?? "") as MembershipApplicationStatus)
    ? searchParams?.status
    : "") as MembershipApplicationStatus | "";
  const membershipCategoryId = searchParams?.membershipCategoryId ?? "";

  const [applications, categories] = await Promise.all([
    listAdminMembershipApplications({
      status: status || undefined,
      membershipCategoryId: membershipCategoryId || undefined,
    }),
    listAdminMembershipCategories(),
  ]);

  return (
    <section className="admin-memberships" aria-labelledby="admin-memberships-heading">
      <div>
        <p className="hero__eyebrow">Admin</p>
        <h1 id="admin-memberships-heading" className="hero__title">Membership applications</h1>
      </div>

      <form className="admin-memberships__filters" method="get">
        <label>
          Status
          <select name="status" defaultValue={status}>
            <option value="">All</option>
            {statuses.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label>
          Membership category
          <select name="membershipCategoryId" defaultValue={membershipCategoryId}>
            <option value="">All</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        <button type="submit" className="button-primary">Apply</button>
      </form>

      <div className="admin-memberships__table-wrap">
        <table className="admin-memberships__table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Category</th>
              <th>Created</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {applications.map((application) => (
              <tr key={application.id}>
                <td>{application.fullName}</td>
                <td>{application.email}</td>
                <td>{application.phone || "-"}</td>
                <td>{application.membershipCategory.name}</td>
                <td>{new Date(application.createdAt).toLocaleString()}</td>
                <td><span className={`admin-memberships__status admin-memberships__status--${application.status}`}>{application.status}</span></td>
                <td><Link href={`/admin/memberships/${application.id}`}>Open</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
