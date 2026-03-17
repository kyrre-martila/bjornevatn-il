import { redirect } from "next/navigation";

import { canManageUsers } from "../../../../lib/roles";
import { getMe } from "../../../../lib/me";

export default async function AdminUsersPage() {
  const me = await getMe();
  if (!canManageUsers(me?.user?.role)) {
    redirect("/access-denied");
  }

  return (
    <section className="admin-pages" aria-labelledby="users-heading">
      <div className="admin-pages__header">
        <div>
          <p className="hero__eyebrow">Admin</p>
          <h1 id="users-heading" className="hero__title">
            Users
          </h1>
          <p className="admin-pages__summary">
            User management is restricted to admin and super_admin roles.
          </p>
        </div>
      </div>
      <p className="admin-pages__help">
        User role assignment UI is not included in this blueprint yet.
      </p>
    </section>
  );
}
