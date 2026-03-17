import { Injectable } from "@nestjs/common";
import type { MatchProvider, ProviderMatch } from "../matches-sync.types";

function parseIcsDate(raw: string): string | null {
  const trimmed = raw.trim();
  const utc = trimmed.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (utc) {
    const [, y, m, d, h, min, s] = utc;
    return `${y}-${m}-${d}T${h}:${min}:${s}.000Z`;
  }
  const local = trimmed.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/);
  if (local) {
    const [, y, m, d, h, min, s] = local;
    return new Date(`${y}-${m}-${d}T${h}:${min}:${s}`).toISOString();
  }
  return null;
}

function unfoldIcsLines(input: string): string[] {
  return input.replace(/\r\n[ \t]/g, "").split(/\r?\n/);
}

@Injectable()
export class ICalMatchProvider implements MatchProvider {
  sourceType = "ical" as const;

  async fetchMatches(input: {
    clubId?: string | null;
    teamIds?: string[];
  }): Promise<ProviderMatch[]> {
    const urls = [input.clubId, ...(input.teamIds ?? [])].filter(
      (v): v is string => typeof v === "string" && v.trim().length > 0,
    );

    const matches: ProviderMatch[] = [];

    for (const url of urls) {
      const res = await fetch(url);
      if (!res.ok) {
        continue;
      }

      const text = await res.text();
      const lines = unfoldIcsLines(text);
      let inEvent = false;
      let event: Record<string, string> = {};

      for (const line of lines) {
        if (line === "BEGIN:VEVENT") {
          inEvent = true;
          event = {};
          continue;
        }
        if (line === "END:VEVENT") {
          inEvent = false;
          const summary = event.SUMMARY ?? "";
          const [homeTeam = "", awayTeam = ""] = summary.split(" - ");
          const dt = event.DTSTART ? parseIcsDate(event.DTSTART) : null;
          const uid = event.UID ?? `${summary}-${event.DTSTART ?? ""}`;
          if (!uid || !dt || !homeTeam || !awayTeam) {
            continue;
          }
          matches.push({
            externalId: uid,
            externalTeamId: null,
            homeTeam: homeTeam.trim(),
            awayTeam: awayTeam.trim(),
            matchDate: dt,
            league: event.CATEGORIES ?? null,
            venue: event.LOCATION ?? null,
            isHomeMatch: /bjørnevatn il/i.test(homeTeam),
            status: "scheduled",
            sourceUrl: url,
          });
          continue;
        }
        if (!inEvent) {
          continue;
        }

        const separator = line.indexOf(":");
        if (separator <= 0) {
          continue;
        }
        const key = line.slice(0, separator).split(";")[0];
        const value = line.slice(separator + 1);
        event[key] = value;
      }
    }

    return matches;
  }
}
