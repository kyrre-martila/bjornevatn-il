import type { ReactNode } from "react";

type AdminSectionCardProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function AdminSectionCard({
  title,
  description,
  actions,
  children,
}: AdminSectionCardProps) {
  return (
    <section className="admin-section-card">
      {title || description || actions ? (
        <header className="admin-section-card__header">
          <div className="admin-section-card__intro">
            {title ? <h2 className="admin-section-card__title">{title}</h2> : null}
            {description ? (
              <p className="admin-section-card__description">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="admin-section-card__actions">{actions}</div> : null}
        </header>
      ) : null}
      <div className="admin-section-card__body">{children}</div>
    </section>
  );
}
