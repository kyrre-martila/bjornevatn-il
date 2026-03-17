import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { canManageUsers } from "../../../../../lib/roles";
import { getMe } from "../../../../../lib/me";
import { getAdminMembershipApplication } from "../../../../../lib/admin/memberships";
import MembershipDetailClient from "./MembershipDetailClient";

export default async function AdminMembershipDetailPage({ params }: { params: { id: string } }) {
  const me = await getMe();
  if (!canManageUsers(me?.user?.role)) redirect("/access-denied");

  const application = await getAdminMembershipApplication(params.id);
  if (!application) notFound();

  return (
    <section className="admin-membership-detail" aria-labelledby="admin-membership-detail-heading">
      <div>
        <p className="hero__eyebrow">Admin</p>
        <h1 id="admin-membership-detail-heading" className="hero__title">Membership application</h1>
        <p><Link href="/admin/memberships">← Back to membership applications</Link></p>
      </div>

      <dl className="admin-membership-detail__info">
        <dt>Full name</dt><dd>{application.fullName}</dd>
        <dt>Email</dt><dd>{application.email}</dd>
        <dt>Phone</dt><dd>{application.phone || "-"}</dd>
        <dt>Date of birth</dt><dd>{application.dateOfBirth ? new Date(application.dateOfBirth).toLocaleDateString() : "-"}</dd>
        <dt>Address line</dt><dd>{application.addressLine || "-"}</dd>
        <dt>Postal code</dt><dd>{application.postalCode || "-"}</dd>
        <dt>City</dt><dd>{application.city || "-"}</dd>
        <dt>Guardian name</dt><dd>{application.guardianName || "-"}</dd>
        <dt>Guardian phone</dt><dd>{application.guardianPhone || "-"}</dd>
        <dt>Guardian email</dt><dd>{application.guardianEmail || "-"}</dd>
        <dt>Membership category</dt><dd>{application.membershipCategory.name}</dd>
        <dt>Applicant notes</dt><dd>{application.notes || "-"}</dd>
        <dt>Status</dt><dd>{application.status}</dd>
        <dt>Created</dt><dd>{new Date(application.createdAt).toLocaleString()}</dd>
      </dl>

      <MembershipDetailClient application={application} />
    </section>
  );
}
