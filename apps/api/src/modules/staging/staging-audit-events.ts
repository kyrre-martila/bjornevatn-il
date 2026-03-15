export const STAGING_AUDIT_EVENTS = {
  viewed: "staging_viewed",
  resetFromLive: "staging_reset_from_live",
  pushToLive: "staging_push_to_live",
  deleted: "staging_deleted",
  actionFailed: "staging_action_failed",
} as const;

export type StagingAuditEvent =
  (typeof STAGING_AUDIT_EVENTS)[keyof typeof STAGING_AUDIT_EVENTS];
