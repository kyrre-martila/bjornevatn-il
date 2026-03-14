import Link from "next/link";
import { listAdminPages } from "../../../../lib/admin/pages";
import { getMe } from "../../../../lib/me";
import { canEditSlug } from "../../../../lib/roles";

const PAGE_SIZE = 50;

function parseOffset(offsetParam?: string): number {
  const parsed = Number(offsetParam);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.floor(parsed / PAGE_SIZE) * PAGE_SIZE;
}

export default async function AdminPagesListPage({
  searchParams,
}: {
  searchParams?: { offset?: string };
}) {
  const me = await getMe();
  const role = me?.user?.role;
  const canCreateDeletePages = canEditSlug(role);
  const canEditPages = Boolean(role);
  const offset = parseOffset(searchParams?.offset);
  const pageBatch = await listAdminPages({ limit: PAGE_SIZE + 1, offset });
  const hasNextPage = pageBatch.length > PAGE_SIZE;
  const pages = pageBatch.slice(0, PAGE_SIZE);
  const publishedCount = pages.filter((page) => page.published).length;

  return (
    <section className="admin-pages" aria-labelledby="pages-heading">
      <div className="admin-pages__header">
        <div>
          <p className="hero__eyebrow">Content</p>
          <h1 id="pages-heading" className="hero__title">
            Pages
          </h1>
          <p className="admin-pages__summary">
            Showing {offset + 1}-{offset + pages.length} • {publishedCount}{" "}
            published • {Math.max(0, pages.length - publishedCount)} drafts
          </p>
        </div>
        {canCreateDeletePages ? (
          <Link href="/admin/pages/new" className="admin-pages__create">
            + New page
          </Link>
        ) : null}
      </div>

      <p className="admin-pages__help">
        Manage routes and block-based content. Select a page to edit details and
        reorder blocks.
      </p>
      {!canCreateDeletePages ? (
        <p className="admin-pages__help">
          Your role can review page content but cannot modify page structure,
          route slugs, or section layout.
        </p>
      ) : null}

      <div className="admin-pages__list" role="list" aria-label="Page list">
        {pages.length === 0 ? (
          <p className="admin-pages__empty">
            No pages yet. Create your first page.
          </p>
        ) : (
          pages.map((page) => (
            <article
              key={page.id}
              role="listitem"
              className="admin-pages__item"
            >
              <div className="admin-pages__item-main">
                <h2>{page.title}</h2>
                <p className="admin-pages__slug">/page/{page.slug}</p>
                <p
                  className={`admin-pages__state admin-pages__state--${page.published ? "published" : "draft"}`}
                >
                  {page.published ? "Published" : "Draft"}
                </p>
              </div>
              <div className="admin-pages__item-actions">
                <Link
                  href={`/page/${page.slug}`}
                  className="admin-pages__view-link"
                  target="_blank"
                  rel="noreferrer"
                >
                  View
                </Link>
                {canEditPages ? (
                  <Link
                    href={`/admin/pages/${page.id}`}
                    className="admin-pages__edit-link"
                  >
                    Edit page
                  </Link>
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>

      <nav aria-label="Page pagination">
        <div>
          {offset > 0 ? (
            <Link
              href={`/admin/pages?offset=${Math.max(0, offset - PAGE_SIZE)}`}
            >
              Previous page
            </Link>
          ) : null}
          {hasNextPage ? (
            <Link href={`/admin/pages?offset=${offset + PAGE_SIZE}`}>
              Next page
            </Link>
          ) : null}
        </div>
      </nav>
    </section>
  );
}
