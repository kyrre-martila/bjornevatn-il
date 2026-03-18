import { notFound, redirect } from "next/navigation";

import { getAdminMembershipApplication } from "../../../../../lib/admin/memberships";
import { getMe } from "../../../../../lib/me";
import { canManageUsers } from "../../../../../lib/roles";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { AdminSectionCard } from "../../components/AdminSectionCard";
import { AdminStatusBadge } from "../../components/AdminStatusBadge";
import MembershipDetailClient from "./MembershipDetailClient";

export default async function AdminMembershipDetailPage({ params }: { params: { id: string } }) {
  const me = await getMe();
  if (!canManageUsers(me?.user?.role)) redirect("/access-denied");

  const application = await getAdminMembershipApplication(params.id);
  if (!application) notFound();

  return (
    <section className="admin-detail-page">
      <AdminPageHeader
        title="Membership application"
        description="Keep applicant details, internal notes, and status updates grouped in the same familiar layout used across admin detail pages."
        backHref="/admin/memberships"
        backLabel="← Back to membership applications"
        actions={<AdminStatusBadge context="membership" value={application.status} />}
      />

      <div className="admin-detail-page__grid">
        <AdminSectionCard title="Applicant details" description="Primary contact and profile information.">
          <dl className="admin-detail-grid">
            <div><dt>Full name</dt><dd>{application.fullName}</dd></div>
            <div><dt>Email</dt><dd>{application.email}</dd></div>
            <div><dt>Phone</dt><dd>{application.phone || "-"}</dd></div>
            <div><dt>Date of birth</dt><dd>{application.dateOfBirth ? new Date(application.dateOfBirth).toLocaleDateString() : "-"}</dd></div>
            <div><dt>Address line</dt><dd>{application.addressLine || "-"}</dd></div>
            <div><dt>Postal code</dt><dd>{application.postalCode || "-"}</dd></div>
            <div><dt>City</dt><dd>{application.city || "-"}</dd></div>
            <div><dt>Membership category</dt><dd>{application.membershipCategory.name}</dd></div>
          </dl>
        </AdminSectionCard>

        <AdminSectionCard title="Guardian and submission details" description="Extra applicant context and the original message submitted.">
          <dl className="admin-detail-grid">
            <div><dt>Guardian name</dt><dd>{application.guardianName || "-"}</dd></div>
            <div><dt>Guardian phone</dt><dd>{application.guardianPhone || "-"}</dd></div>
            <div><dt>Guardian email</dt><dd>{application.guardianEmail || "-"}</dd></div>
            <div><dt>Submitted</dt><dd>{new Date(application.createdAt).toLocaleString()}</dd></div>
            <div><dt>Last updated</dt><dd>{new Date(application.updatedAt).toLocaleString()}</dd></div>
            <div><dt>Applicant notes</dt><dd>{application.notes || "-"}</dd></div>
            <div><dt>Status</dt><dd><AdminStatusBadge context="membership" value={application.status} /></dd></div>
          </dl>
        </AdminSectionCard>
      </div>

      <AdminSectionCard title="Admin review" description="Update the application status and internal notes from a single action area.">
        <MembershipDetailClient application={application} />
      </AdminSectionCard>
    </section>
  );
}
