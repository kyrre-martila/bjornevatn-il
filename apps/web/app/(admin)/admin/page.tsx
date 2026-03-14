import { getMe } from "../../../lib/me";

export default async function AdminOverviewPage() {
  const me = await getMe();
  const user = me?.user;

  return (
    <section className="hero" aria-labelledby="admin-heading">
      <p className="hero__eyebrow">Admin interface</p>
      <h1 id="admin-heading" className="hero__title">
        {user
          ? `Welcome back, ${user.firstName || user.email}`
          : "Admin access"}
      </h1>
      <p className="hero__subtitle">
        Editor mode is focused on practical content updates, while builder/system
        mode is reserved for super admins managing content setup and platform structure.
      </p>
    </section>
  );
}
