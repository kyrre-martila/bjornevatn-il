"use server";

import { revalidatePath } from "next/cache";
import {
  runMatchSync,
  saveMatchSyncSettings,
} from "../../../../../lib/admin/matches";

export async function updateMatchSyncSettingsAction(formData: FormData) {
  const teamIds = String(formData.get("teamIds") ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  const ok = await saveMatchSyncSettings({
    enabled: formData.get("enabled") === "on",
    clubName: String(formData.get("clubName") ?? "") || null,
    clubId: String(formData.get("clubId") ?? "") || null,
    teamIds,
    sourceType: String(formData.get("sourceType") ?? "ical"),
    importMode: String(formData.get("importMode") ?? "create_and_update"),
    autoSyncEnabled: formData.get("autoSyncEnabled") === "on",
    syncIntervalMinutes: Number(formData.get("syncIntervalMinutes") ?? 60),
  });

  if (ok) {
    revalidatePath("/admin/matches/sync");
  }
}

export async function runMatchSyncAction() {
  await runMatchSync();
  revalidatePath("/admin/matches/sync");
  revalidatePath("/admin/matches");
  revalidatePath("/");
  revalidatePath("/tickets");
}
