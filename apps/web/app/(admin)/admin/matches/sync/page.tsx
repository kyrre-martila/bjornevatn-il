import { redirect } from "next/navigation";

import { getMatchSyncSettings } from "../../../../../lib/admin/matches";
import { getMe } from "../../../../../lib/me";
import { canManageUsers } from "../../../../../lib/roles";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { AdminSectionCard } from "../../components/AdminSectionCard";
import { AdminStatusBadge } from "../../components/AdminStatusBadge";
import { runMatchSyncAction, updateMatchSyncSettingsAction } from "./actions";

export default async function AdminMatchSyncPage() {
  const me = await getMe();
  if (!canManageUsers(me?.user?.role)) {
    redirect("/access-denied");
  }

  const settings = await getMatchSyncSettings();

  return (
    <section className="admin-detail-page">
      <AdminPageHeader
        title="Match sync"
        description="Manage external match import settings and review the latest sync status in the same sectioned layout used by other admin detail screens."
        actions={
          <AdminStatusBadge
            context="matchSync"
            value={settings?.lastSyncStatus ?? "never"}
          />
        }
      />

      <div className="admin-detail-page__grid">
        <AdminSectionCard title="Sync settings" description="Connection and import controls for the match integration.">
          <form action={updateMatchSyncSettingsAction} className="admin-form-panel">
            <div className="admin-form-panel__grid">
              <label className="admin-form-panel__field admin-form-panel__field--checkbox">
                <input type="checkbox" name="enabled" defaultChecked={settings?.enabled} />
                <span>Enable integration</span>
              </label>
              <label className="admin-form-panel__field">
                <span>Club name</span>
                <input name="clubName" type="text" defaultValue={settings?.clubName ?? ""} />
              </label>
              <label className="admin-form-panel__field">
                <span>Club ID / iCal URL</span>
                <input name="clubId" type="text" defaultValue={settings?.clubId ?? ""} />
              </label>
              <label className="admin-form-panel__field admin-form-panel__field--full">
                <span>Team IDs / iCal URLs (comma separated)</span>
                <input name="teamIds" type="text" defaultValue={(settings?.teamIds ?? []).join(",")} />
              </label>
              <label className="admin-form-panel__field">
                <span>Source type</span>
                <select name="sourceType" defaultValue={settings?.sourceType ?? "ical"}>
                  <option value="ical">iCal feed</option>
                  <option value="fotball_no">Fotball.no (adapter ready)</option>
                </select>
              </label>
              <label className="admin-form-panel__field">
                <span>Import mode</span>
                <select
                  name="importMode"
                  defaultValue={settings?.importMode ?? "create_and_update"}
                >
                  <option value="create_only">Create only</option>
                  <option value="create_and_update">Create and update</option>
                </select>
              </label>
              <label className="admin-form-panel__field admin-form-panel__field--checkbox">
                <input
                  type="checkbox"
                  name="autoSyncEnabled"
                  defaultChecked={settings?.autoSyncEnabled}
                />
                <span>Auto sync enabled</span>
              </label>
              <label className="admin-form-panel__field">
                <span>Sync interval (minutes)</span>
                <input
                  name="syncIntervalMinutes"
                  type="number"
                  min={5}
                  defaultValue={settings?.syncIntervalMinutes ?? 60}
                />
              </label>
            </div>
            <div className="admin-form-actions">
              <button type="submit" className="button-primary">
                Save settings
              </button>
            </div>
          </form>
        </AdminSectionCard>

        <AdminSectionCard title="Latest sync" description="Status, timestamp, and summary message from the most recent sync run.">
          <dl className="admin-detail-grid">
            <div>
              <dt>Status</dt>
              <dd>
                <AdminStatusBadge
                  context="matchSync"
                  value={settings?.lastSyncStatus ?? "never"}
                />
              </dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd>
                {settings?.lastSyncAt
                  ? new Date(settings.lastSyncAt).toLocaleString("no-NO")
                  : "-"}
              </dd>
            </div>
            <div>
              <dt>Message</dt>
              <dd>{settings?.lastSyncMessage ?? "No sync has been run yet."}</dd>
            </div>
          </dl>
          <form action={runMatchSyncAction} className="admin-form-actions">
            <button type="submit" className="button-primary">
              Run sync now
            </button>
          </form>
        </AdminSectionCard>
      </div>
    </section>
  );
}
