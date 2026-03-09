import Link from "next/link";
import { listAdminPages } from "../../../../lib/admin/pages";

export default async function AdminPagesListPage() {
  const pages = await listAdminPages();

  return (
    <section className="admin-pages">
      <div className="admin-pages__header">
        <div>
          <p className="hero__eyebrow">Content</p>
          <h1 className="hero__title">Pages</h1>
        </div>
        <Link href="/admin/pages/new" className="admin-pages__create">
          Create page
        </Link>
      </div>

      <div className="admin-pages__list" role="list" aria-label="Page list">
        {pages.length === 0 ? (
          <p className="admin-pages__empty">No pages yet. Create your first page.</p>
        ) : (
          pages.map((page) => (
            <article key={page.id} role="listitem" className="admin-pages__item">
              <div>
                <h2>{page.title}</h2>
                <p>/page/{page.slug}</p>
                <p>{page.published ? "Published" : "Draft"}</p>
              </div>
              <Link href={`/admin/pages/${page.id}`} className="admin-pages__edit-link">
                Edit
              </Link>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
