"use client";

import * as React from "react";
import type { AdminSiteSetting } from "../../../../lib/admin/settings";

const RECOMMENDED_KEYS = [
  "siteName",
  "siteUrl",
  "defaultSeoImage",
  "defaultTitleSuffix",
  "site_title",
  "site_tagline",
  "logo_url",
  "footer_text",
  "facebook_url",
  "instagram_url",
  "youtube_url",
  "site_url",
  "robots_noindex",
  "robots_disallow_all",
  "twitter_handle",
  "facebookPageUrl",
  "defaultMetaImage",
  "defaultMetaTitleSuffix",
  "robotsIndexEnabled",
  "robotsFollowEnabled",
  "googleVerificationCode",
  "bingVerificationCode",
  "favicon",
  "appleTouchIcon",
  "manifestIcon",
] as const;

export function SettingsEditorClient({
  initialSettings,
}: {
  initialSettings: AdminSiteSetting[];
}) {
  const [settings, setSettings] =
    React.useState<AdminSiteSetting[]>(initialSettings);
  const [drafts, setDrafts] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(initialSettings.map((item) => [item.key, item.value])),
  );
  const [newKey, setNewKey] = React.useState("");
  const [newValue, setNewValue] = React.useState("");
  const [status, setStatus] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const allKeys = React.useMemo(() => {
    const keys = new Set(settings.map((item) => item.key));
    for (const key of RECOMMENDED_KEYS) {
      keys.add(key);
    }
    return Array.from(keys).sort();
  }, [settings]);

  function valueForKey(key: string) {
    return drafts[key] ?? "";
  }

  async function reloadSettings() {
    const res = await fetch("/api/admin/settings", { cache: "no-store" });
    const data = await res.json().catch(() => []);
    if (!res.ok || !Array.isArray(data)) {
      throw new Error("Unable to refresh settings.");
    }
    setSettings(data as AdminSiteSetting[]);
    setDrafts(
      Object.fromEntries(
        (data as AdminSiteSetting[]).map((item) => [item.key, item.value]),
      ),
    );
  }

  async function saveSetting(key: string, value: string) {
    const trimmedKey = key.trim();
    if (!trimmedKey) {
      setError("Setting key is required.");
      return;
    }

    setStatus(null);
    setError(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key: trimmedKey, value }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const message =
          (data && (data.message || data.error)) || "Unable to save setting.";
        setError(
          typeof message === "string" ? message : "Unable to save setting.",
        );
        return;
      }

      await reloadSettings();
      setStatus(`Saved setting: ${trimmedKey}`);
      setNewKey("");
      setNewValue("");
    } catch {
      setError("Network error while saving setting.");
    }
  }

  return (
    <section className="page-editor" aria-labelledby="settings-heading">
      <div className="page-editor__header">
        <p className="hero__eyebrow">Content</p>
        <h1 id="settings-heading">Site settings</h1>
        <p>Manage global branding and social link settings.</p>
      </div>

      {error && <p className="page-editor__error">{error}</p>}
      {status && <p className="page-editor__status">{status}</p>}

      <div
        className="admin-settings__list"
        role="list"
        aria-label="Site settings list"
      >
        {allKeys.map((key) => (
          <form
            key={key}
            className="admin-settings__row"
            role="listitem"
            onSubmit={(e) => {
              e.preventDefault();
              void saveSetting(key, valueForKey(key));
            }}
          >
            <label>
              {key}
              <input
                value={valueForKey(key)}
                onChange={(e) =>
                  setDrafts((current) => ({
                    ...current,
                    [key]: e.target.value,
                  }))
                }
              />
            </label>
            <button type="submit">Save</button>
          </form>
        ))}
      </div>

      <form
        className="admin-settings__new"
        onSubmit={(e) => {
          e.preventDefault();
          void saveSetting(newKey, newValue);
        }}
      >
        <h2>Create custom setting</h2>
        <label>
          Key
          <input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="e.g. linkedin_url"
          />
        </label>
        <label>
          Value
          <input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
          />
        </label>
        <button type="submit">Create setting</button>
      </form>
    </section>
  );
}
