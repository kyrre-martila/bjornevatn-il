import Link from "next/link";

type AdminPaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  basePath: string;
  query?: Record<string, string | undefined>;
  ariaLabel?: string;
};

function buildHref(
  basePath: string,
  page: number,
  query?: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  params.set("page", String(page));

  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

export function AdminPagination({
  page,
  totalPages,
  total,
  basePath,
  query,
  ariaLabel = "Pagination",
}: AdminPaginationProps) {
  const previousPage = Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);

  return (
    <nav className="admin-pagination" aria-label={ariaLabel}>
      <p className="admin-pagination__summary">
        Page {page} of {Math.max(totalPages, 1)} <span>• {total} total results</span>
      </p>
      <div className="admin-pagination__controls">
        {page > 1 ? (
          <Link href={buildHref(basePath, previousPage, query)}>
            Previous
          </Link>
        ) : (
          <span aria-disabled="true">Previous</span>
        )}
        {page < totalPages ? (
          <Link href={buildHref(basePath, nextPage, query)}>Next</Link>
        ) : (
          <span aria-disabled="true">Next</span>
        )}
      </div>
    </nav>
  );
}
