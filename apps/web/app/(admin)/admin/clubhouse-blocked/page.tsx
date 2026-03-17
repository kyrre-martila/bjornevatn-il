import { redirect } from "next/navigation";

import { listAdminBlockedPeriods } from "../../../../lib/admin/clubhouse";
import { getMe } from "../../../../lib/me";
import { canManageUsers } from "../../../../lib/roles";
import BlockedPeriodsClient from "./BlockedPeriodsClient";

export default async function AdminClubhouseBlockedPage() {
  const me = await getMe();
  if (!canManageUsers(me?.user?.role)) {
    redirect("/access-denied");
  }

  const periods = await listAdminBlockedPeriods();

  return (
    <section className="admin-blocked" aria-labelledby="clubhouse-blocked-heading">
      <div className="admin-blocked__header">
        <p className="hero__eyebrow">Admin</p>
        <h1 id="clubhouse-blocked-heading" className="hero__title">Clubhouse blocked periods</h1>
      </div>
      <BlockedPeriodsClient periods={periods} />
    </section>
  );
}
