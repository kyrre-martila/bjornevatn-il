import Link from "next/link";
import { redirect } from "next/navigation";

import { getMe } from "../../../../lib/me";
import { canAccessSchema } from "../../../../lib/roles";

const SYSTEM_LINKS = [
  {
    href: "/admin/content",
    title: "Content models and schema",
    description:
      "Manage content type definitions, field schema, and structure used by editor mode.",
  },
  {
    href: "/admin/navigation",
    title: "Navigation structure",
    description: "Maintain navigation registries and menu structure.",
  },
  {
    href: "/admin/staging",
    title: "Staging and system operations",
    description: "Review pre-production status and run system-level publishing tasks.",
  },
] as const;

export default async function AdminSystemPage() {
  const me = await getMe();

  if (!canAccessSchema(me?.user?.role)) {
    redirect("/access-denied");
  }

  return (
    <section className="admin-pages" aria-labelledby="admin-system-heading">
      <div className="admin-pages__header">
        <div>
          <h1 id="admin-system-heading">Builder / system mode</h1>
          <p className="admin-pages__summary">
            This area is restricted to super admins and contains architecture and
            schema controls.
          </p>
        </div>
      </div>

      <div className="admin-pages__list" role="list" aria-label="System areas">
        {SYSTEM_LINKS.map((item) => (
          <article key={item.href} className="admin-pages__item" role="listitem">
            <div className="admin-pages__item-main">
              <h2>{item.title}</h2>
              <p className="admin-pages__help">{item.description}</p>
            </div>
            <div className="admin-pages__item-actions">
              <Link href={item.href} className="admin-pages__edit-link">
                Open
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
