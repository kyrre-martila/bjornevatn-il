import Link from "next/link";
import type { ReactNode } from "react";

type AdminPageHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
};

export function AdminPageHeader({
  title,
  description,
  eyebrow = "Admin",
  actions,
  backHref,
  backLabel,
}: AdminPageHeaderProps) {
  return (
    <header className="admin-page-header">
      <div className="admin-page-header__content">
        <p className="hero__eyebrow">{eyebrow}</p>
        <h1 className="hero__title">{title}</h1>
        {description ? (
          <p className="admin-page-header__description">{description}</p>
        ) : null}
        {backHref && backLabel ? (
          <p className="admin-page-header__back-link">
            <Link href={backHref}>{backLabel}</Link>
          </p>
        ) : null}
      </div>
      {actions ? <div className="admin-page-header__actions">{actions}</div> : null}
    </header>
  );
}
