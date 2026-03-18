import Link from "next/link";
import { redirect } from "next/navigation";

import { getMe } from "../../../../lib/me";
import { canManageUsers } from "../../../../lib/roles";
import {
  getAdminObservabilityDashboard,
  type AdminOperationalEvent,
  type ObservabilityRange,
} from "../../../../lib/admin/observability";
import { AdminEmptyState } from "../components/AdminEmptyState";
import { AdminPageHeader } from "../components/AdminPageHeader";
import { AdminSectionCard } from "../components/AdminSectionCard";
import "./observability.css";

const RANGE_OPTIONS: Array<{ label: string; value: ObservabilityRange }> = [
  { label: "Today", value: "today" },
  { label: "Last 7 days", value: "last7Days" },
  { label: "Last 30 days", value: "last30Days" },
];

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatMetadata(event: AdminOperationalEvent) {
  const metadata = event.metadata ?? {};
  const summaryPairs = [
    metadata.submissionType ? `Type: ${String(metadata.submissionType)}` : null,
    metadata.endpointCategory
      ? `Endpoint: ${String(metadata.endpointCategory)}`
      : null,
    metadata.flow ? `Flow: ${String(metadata.flow)}` : null,
    metadata.durationMs ? `Duration: ${String(metadata.durationMs)} ms` : null,
    metadata.reason ? `Reason: ${String(metadata.reason)}` : null,
    metadata.provider ? `Provider: ${String(metadata.provider)}` : null,
  ].filter(Boolean);

  return summaryPairs.length > 0
    ? summaryPairs.join(" • ")
    : "No extra metadata";
}

function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span
      className={`admin-observability__badge admin-observability__badge--${severity}`}
    >
      {severity}
    </span>
  );
}

export default async function AdminObservabilityPage({
  searchParams,
}: {
  searchParams?: Promise<{ range?: ObservabilityRange }>;
}) {
  const me = await getMe();
  if (!canManageUsers(me?.user?.role)) {
    redirect("/access-denied");
  }

  const params = await searchParams;
  const range = RANGE_OPTIONS.some((option) => option.value === params?.range)
    ? (params?.range as ObservabilityRange)
    : "last7Days";

  const dashboard = await getAdminObservabilityDashboard(range);

  if (!dashboard) {
    return (
      <section className="admin-detail-page">
        <AdminPageHeader
          title="Observability"
          description="Operational event summaries, recent failures, and lightweight trends for the MVP platform."
        />
        <AdminEmptyState
          title="Observability data unavailable"
          description="The dashboard could not load the latest operational data from the API. Verify the backend is running and the current user still has admin access."
          actionHref="/admin/system"
          actionLabel="Open system overview"
        />
      </section>
    );
  }

  return (
    <section className="admin-detail-page admin-observability">
      <AdminPageHeader
        title="Observability"
        description="Review recent operational events, match sync health, abuse signals, and lightweight trend summaries without leaving the shared admin workflow."
        actions={
          <div
            className="admin-observability__range-switcher"
            aria-label="Observability range filters"
          >
            {RANGE_OPTIONS.map((option) => (
              <Link
                key={option.value}
                href={`/admin/observability?range=${option.value}`}
                className={`admin-observability__range-link${option.value === range ? " admin-observability__range-link--active" : ""}`}
              >
                {option.label}
              </Link>
            ))}
          </div>
        }
      />

      <AdminSectionCard
        title="Top-line counts"
        description={`Summary since ${new Date(dashboard.startAt).toLocaleDateString("en-GB")}.`}
      >
        <div className="admin-observability__stats-grid">
          <article className="admin-observability__stat-card">
            <span className="admin-observability__stat-label">
              Bookings submitted
            </span>
            <strong className="admin-observability__stat-value">
              {dashboard.counts.bookingsSubmitted}
            </strong>
          </article>
          <article className="admin-observability__stat-card">
            <span className="admin-observability__stat-label">
              Memberships submitted
            </span>
            <strong className="admin-observability__stat-value">
              {dashboard.counts.membershipsSubmitted}
            </strong>
          </article>
          <article className="admin-observability__stat-card">
            <span className="admin-observability__stat-label">
              Ticket orders created
            </span>
            <strong className="admin-observability__stat-value">
              {dashboard.counts.ticketOrdersCreated}
            </strong>
          </article>
          <article className="admin-observability__stat-card">
            <span className="admin-observability__stat-label">
              Scan conflicts
            </span>
            <strong className="admin-observability__stat-value">
              {dashboard.counts.scanConflicts}
            </strong>
          </article>
          <article className="admin-observability__stat-card">
            <span className="admin-observability__stat-label">
              Match sync failures
            </span>
            <strong className="admin-observability__stat-value">
              {dashboard.counts.matchSyncFailures}
            </strong>
          </article>
        </div>
      </AdminSectionCard>

      <div className="admin-observability__grid">
        <AdminSectionCard
          title="Recent operational events"
          description="Latest structured events across rate limits, submissions, sync, scanning, and admin failures."
        >
          <div className="admin-card-list" role="list">
            {dashboard.recentEvents.map((event) => (
              <article
                key={event.id}
                className="admin-card-list__item admin-observability__event-card"
                role="listitem"
              >
                <div className="admin-observability__event-header">
                  <strong>{event.eventType}</strong>
                  <SeverityBadge severity={event.severity} />
                </div>
                <p className="admin-observability__event-meta">
                  {formatDateTime(event.createdAt)} •{" "}
                  {event.module ?? "unknown module"} •{" "}
                  {event.route ?? "unknown route"}
                </p>
                <p className="admin-observability__event-copy">
                  {formatMetadata(event)}
                </p>
              </article>
            ))}
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          title="Recent sync runs"
          description="Persisted match sync runs with provider, status, counts, and duration."
        >
          <div className="admin-card-list" role="list">
            {dashboard.recentSyncRuns.map((run) => (
              <article
                key={run.id}
                className="admin-card-list__item admin-observability__event-card"
                role="listitem"
              >
                <div className="admin-observability__event-header">
                  <strong>{run.provider}</strong>
                  <span
                    className={`admin-observability__badge admin-observability__badge--${run.status === "failed" ? "error" : "info"}`}
                  >
                    {run.status}
                  </span>
                </div>
                <p className="admin-observability__event-meta">
                  Started {formatDateTime(run.startedAt)} •{" "}
                  {run.durationMs ?? 0} ms
                </p>
                <p className="admin-observability__event-copy">
                  Created {run.createdCount}, updated {run.updatedCount},
                  skipped {run.skippedCount}, failed {run.failedCount}
                  {run.failureReason ? ` • ${run.failureReason}` : ""}
                </p>
              </article>
            ))}
          </div>
        </AdminSectionCard>
      </div>

      <div className="admin-observability__grid">
        <AdminSectionCard
          title="Rate-limit events"
          description="Recent triggers grouped by lightweight route and endpoint category context."
        >
          <div className="admin-card-list" role="list">
            {dashboard.recentRateLimitEvents.map((event) => (
              <article
                key={event.id}
                className="admin-card-list__item admin-observability__event-card"
                role="listitem"
              >
                <strong>
                  {String(
                    event.metadata?.endpointCategory ??
                      event.route ??
                      "unknown",
                  )}
                </strong>
                <p className="admin-observability__event-meta">
                  {formatDateTime(event.createdAt)}
                </p>
                <p className="admin-observability__event-copy">
                  {formatMetadata(event)}
                </p>
              </article>
            ))}
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          title="Public submission failures"
          description="Recent booking, membership, and ticket order failures that need operator visibility."
        >
          <div className="admin-card-list" role="list">
            {dashboard.recentPublicSubmissionFailures.map((event) => (
              <article
                key={event.id}
                className="admin-card-list__item admin-observability__event-card"
                role="listitem"
              >
                <strong>
                  {String(event.metadata?.submissionType ?? event.eventType)}
                </strong>
                <p className="admin-observability__event-meta">
                  {formatDateTime(event.createdAt)}
                </p>
                <p className="admin-observability__event-copy">
                  {formatMetadata(event)}
                </p>
              </article>
            ))}
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          title="Ticket scan conflicts"
          description="Recent already-used or concurrent-entry conflicts while preserving scan audit history."
        >
          <div className="admin-card-list" role="list">
            {dashboard.recentTicketScanConflicts.map((event) => (
              <article
                key={event.id}
                className="admin-card-list__item admin-observability__event-card"
                role="listitem"
              >
                <strong>
                  {String(event.metadata?.orderReference ?? event.eventType)}
                </strong>
                <p className="admin-observability__event-meta">
                  {formatDateTime(event.createdAt)}
                </p>
                <p className="admin-observability__event-copy">
                  {formatMetadata(event)}
                </p>
              </article>
            ))}
          </div>
        </AdminSectionCard>
      </div>

      <AdminSectionCard
        title="Trend summaries"
        description="Simple grouped views for failures, abuse signals, scan conflicts, and provider issues."
      >
        <div className="admin-observability__grid admin-observability__grid--compact">
          <div className="admin-observability__trend-card">
            <h3>Failed bookings by day</h3>
            <ul className="admin-observability__trend-list">
              {dashboard.trends.failedBookingsByDay.map((item) => (
                <li key={item.date}>
                  <span>{item.date}</span>
                  <strong>{item.count}</strong>
                </li>
              ))}
            </ul>
          </div>
          <div className="admin-observability__trend-card">
            <h3>Rate-limit hits by endpoint</h3>
            <ul className="admin-observability__trend-list">
              {dashboard.trends.rateLimitHitsByEndpoint.map((item) => (
                <li key={item.endpoint}>
                  <span>{item.endpoint}</span>
                  <strong>{item.count}</strong>
                </li>
              ))}
            </ul>
          </div>
          <div className="admin-observability__trend-card">
            <h3>Scan conflicts by day</h3>
            <ul className="admin-observability__trend-list">
              {dashboard.trends.scanConflictsByDay.map((item) => (
                <li key={item.date}>
                  <span>{item.date}</span>
                  <strong>{item.count}</strong>
                </li>
              ))}
            </ul>
          </div>
          <div className="admin-observability__trend-card">
            <h3>Sync failures by provider</h3>
            <ul className="admin-observability__trend-list">
              {dashboard.trends.syncFailuresByProvider.map((item) => (
                <li key={item.provider}>
                  <span>{item.provider}</span>
                  <strong>{item.count}</strong>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </AdminSectionCard>
    </section>
  );
}
