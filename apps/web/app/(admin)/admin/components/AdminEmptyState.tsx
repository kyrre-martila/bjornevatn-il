import Link from "next/link";
import type { ReactNode } from "react";

type AdminEmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
  actionHref?: string;
  actionLabel?: string;
};

export function AdminEmptyState({
  title,
  description,
  action,
  actionHref,
  actionLabel,
}: AdminEmptyStateProps) {
  return (
    <div className="admin-empty-state" role="status">
      <h2 className="admin-empty-state__title">{title}</h2>
      <p className="admin-empty-state__description">{description}</p>
      {action ??
        (actionHref && actionLabel ? (
          <Link href={actionHref} className="button-primary">
            {actionLabel}
          </Link>
        ) : null)}
    </div>
  );
}
