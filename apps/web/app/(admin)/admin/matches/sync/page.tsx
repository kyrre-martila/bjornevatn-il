import { redirect } from "next/navigation";
import { getMe } from "../../../../../lib/me";
import { canManageUsers } from "../../../../../lib/roles";
import { getMatchSyncSettings } from "../../../../../lib/admin/matches";
import { runMatchSyncAction, updateMatchSyncSettingsAction } from "./actions";

export default async function AdminMatchSyncPage() {
  const me = await getMe();
  if (!canManageUsers(me?.user?.role)) {
    redirect("/access-denied");
  }

  const settings = await getMatchSyncSettings();

  return (
    <section
      className="admin-match-sync"
      aria-labelledby="admin-match-sync-heading"
    >
      <h1 id="admin-match-sync-heading" className="hero__title">
        Match sync
      </h1>

      <form
        action={updateMatchSyncSettingsAction}
        className="admin-match-sync__form"
      >
        <label className="admin-match-sync__field">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={settings?.enabled}
          />
          Enable integration
        </label>
        <label className="admin-match-sync__field">
          Club name
          <input
            name="clubName"
            type="text"
            defaultValue={settings?.clubName ?? ""}
          />
        </label>
        <label className="admin-match-sync__field">
          Club ID / iCal URL
          <input
            name="clubId"
            type="text"
            defaultValue={settings?.clubId ?? ""}
          />
        </label>
        <label className="admin-match-sync__field">
          Team IDs / iCal URLs (comma separated)
          <input
            name="teamIds"
            type="text"
            defaultValue={(settings?.teamIds ?? []).join(",")}
          />
        </label>
        <label className="admin-match-sync__field">
          Source type
          <select
            name="sourceType"
            defaultValue={settings?.sourceType ?? "ical"}
          >
            <option value="ical">iCal feed</option>
            <option value="fotball_no">Fotball.no (adapter ready)</option>
          </select>
        </label>
        <label className="admin-match-sync__field">
          Import mode
          <select
            name="importMode"
            defaultValue={settings?.importMode ?? "create_and_update"}
          >
            <option value="create_only">Create only</option>
            <option value="create_and_update">Create and update</option>
          </select>
        </label>
        <label className="admin-match-sync__field">
          <input
            type="checkbox"
            name="autoSyncEnabled"
            defaultChecked={settings?.autoSyncEnabled}
          />
          Auto sync enabled
        </label>
        <label className="admin-match-sync__field">
          Sync interval (minutes)
          <input
            name="syncIntervalMinutes"
            type="number"
            min={5}
            defaultValue={settings?.syncIntervalMinutes ?? 60}
          />
        </label>
        <button type="submit" className="button-primary">
          Save settings
        </button>
      </form>

      <article className="admin-match-sync__status">
        <h2>Last sync</h2>
        <p>Status: {settings?.lastSyncStatus ?? "never"}</p>
        <p>
          Time:{" "}
          {settings?.lastSyncAt
            ? new Date(settings.lastSyncAt).toLocaleString("no-NO")
            : "-"}
        </p>
        <p>
          Message: {settings?.lastSyncMessage ?? "No sync has been run yet."}
        </p>
      </article>

      <form action={runMatchSyncAction}>
        <button type="submit" className="button-primary">
          Run Sync Now
        </button>
      </form>
    </section>
  );
}
