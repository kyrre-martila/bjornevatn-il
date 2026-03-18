import { getAdminStatusPresentation, type AdminStatusContext } from "../../../../lib/admin/status";

type AdminStatusBadgeProps = {
  context: AdminStatusContext;
  value: string | null | undefined;
};

export function AdminStatusBadge({ context, value }: AdminStatusBadgeProps) {
  const presentation = getAdminStatusPresentation(context, value);

  return (
    <span
      className={`admin-status-badge admin-status-badge--${presentation.tone}`}
    >
      {presentation.label}
    </span>
  );
}
