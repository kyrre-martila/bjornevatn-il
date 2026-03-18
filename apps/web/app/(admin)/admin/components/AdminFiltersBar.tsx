import type { ComponentPropsWithoutRef, ReactNode } from "react";

type AdminFiltersBarProps = ComponentPropsWithoutRef<"form"> & {
  actions?: ReactNode;
};

export function AdminFiltersBar({
  actions,
  children,
  className,
  ...props
}: AdminFiltersBarProps) {
  const nextClassName = ["admin-filters-bar", className]
    .filter(Boolean)
    .join(" ");

  return (
    <form {...props} className={nextClassName}>
      <div className="admin-filters-bar__fields">{children}</div>
      {actions ? <div className="admin-filters-bar__actions">{actions}</div> : null}
    </form>
  );
}
