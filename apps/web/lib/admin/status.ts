export type AdminStatusContext =
  | "booking"
  | "membership"
  | "ticketSale"
  | "ticketOrder"
  | "ticketValidation"
  | "match"
  | "matchSync"
  | "availability";

export type AdminStatusTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger";

export type AdminStatusPresentation = {
  label: string;
  tone: AdminStatusTone;
};

const STATUS_PRESENTATIONS: Record<
  AdminStatusContext,
  Record<string, AdminStatusPresentation>
> = {
  booking: {
    pending: { label: "Pending review", tone: "warning" },
    approved: { label: "Approved", tone: "success" },
    rejected: { label: "Rejected", tone: "danger" },
    cancelled: { label: "Cancelled", tone: "neutral" },
  },
  membership: {
    new: { label: "New", tone: "warning" },
    contacted: { label: "Contacted", tone: "info" },
    approved: { label: "Approved", tone: "success" },
    rejected: { label: "Rejected", tone: "danger" },
    archived: { label: "Archived", tone: "neutral" },
  },
  ticketSale: {
    draft: { label: "Draft", tone: "neutral" },
    active: { label: "On sale", tone: "success" },
    sold_out: { label: "Sold out", tone: "warning" },
    closed: { label: "Closed", tone: "neutral" },
  },
  ticketOrder: {
    reserved: { label: "Reserved", tone: "warning" },
    confirmed: { label: "Confirmed", tone: "success" },
    cancelled: { label: "Cancelled", tone: "neutral" },
    used: { label: "Used", tone: "info" },
  },
  ticketValidation: {
    valid: { label: "Valid", tone: "success" },
    used: { label: "Checked in", tone: "info" },
    cancelled: { label: "Cancelled", tone: "neutral" },
    revoked: { label: "Revoked", tone: "danger" },
  },
  match: {
    scheduled: { label: "Scheduled", tone: "info" },
    postponed: { label: "Postponed", tone: "warning" },
    cancelled: { label: "Cancelled", tone: "danger" },
    completed: { label: "Completed", tone: "success" },
    active: { label: "Active", tone: "success" },
    draft: { label: "Draft", tone: "neutral" },
  },
  matchSync: {
    success: { label: "Successful", tone: "success" },
    succeeded: { label: "Successful", tone: "success" },
    ok: { label: "Successful", tone: "success" },
    warning: { label: "Completed with warnings", tone: "warning" },
    failed: { label: "Failed", tone: "danger" },
    error: { label: "Failed", tone: "danger" },
    idle: { label: "Idle", tone: "neutral" },
    running: { label: "Running", tone: "info" },
    never: { label: "Not run yet", tone: "neutral" },
  },
  availability: {
    enabled: { label: "Enabled", tone: "success" },
    disabled: { label: "Disabled", tone: "neutral" },
  },
};

function startCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function getAdminStatusPresentation(
  context: AdminStatusContext,
  value: string | null | undefined,
): AdminStatusPresentation {
  const normalizedValue = value?.trim().toLowerCase() ?? "";

  if (!normalizedValue) {
    return { label: "Unknown", tone: "neutral" };
  }

  const mapped = STATUS_PRESENTATIONS[context][normalizedValue];
  if (mapped) {
    return mapped;
  }

  if (context === "match") {
    if (normalizedValue.includes("cancel")) {
      return { label: startCase(normalizedValue), tone: "danger" };
    }
    if (
      normalizedValue.includes("postpon") ||
      normalizedValue.includes("delay")
    ) {
      return { label: startCase(normalizedValue), tone: "warning" };
    }
    if (
      normalizedValue.includes("complete") ||
      normalizedValue.includes("final") ||
      normalizedValue.includes("played")
    ) {
      return { label: startCase(normalizedValue), tone: "success" };
    }
  }

  if (context === "matchSync") {
    if (
      normalizedValue.includes("fail") ||
      normalizedValue.includes("error")
    ) {
      return { label: startCase(normalizedValue), tone: "danger" };
    }
    if (normalizedValue.includes("warn")) {
      return { label: startCase(normalizedValue), tone: "warning" };
    }
    if (
      normalizedValue.includes("success") ||
      normalizedValue.includes("ok")
    ) {
      return { label: startCase(normalizedValue), tone: "success" };
    }
  }

  return { label: startCase(normalizedValue), tone: "neutral" };
}
