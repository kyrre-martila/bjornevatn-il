import type { Metadata } from "next";
import Link from "next/link";

import { getTeams } from "../../../lib/content";
import { buildMetadata } from "../../../lib/seo";


export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    pageTitle: "Teams | Bjørnevatn IL",
    pageDescription: "Overview of Bjørnevatn IL teams",
    path: "/teams",
  });
}

export default async function TeamsPage() {
  const teams = await getTeams();

  const youthTeams = teams
    .filter((team) => team.mainCategory === "aldersbestemt")
    .sort((a, b) => (a.age ?? Number.MAX_SAFE_INTEGER) - (b.age ?? Number.MAX_SAFE_INTEGER));

  const seniorTeams = teams
    .filter((team) => team.mainCategory === "senior")
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const renderGroup = (title: string, items: typeof teams) => (
    <section className="stack">
      <h2>{title}</h2>
      <div className="grid grid--2">
        {items.map((team) => (
          <article key={team.id} className="public-block stack" style={{ border: "1px solid var(--color-border)", borderRadius: "8px", padding: "1rem" }}>
            {team.teamImage ? (
              <img src={team.teamImage} alt={team.name} style={{ width: "100%", borderRadius: "6px" }} />
            ) : null}
            <h3>{team.name}</h3>
            <p>{team.shortDescription}</p>
            <Link href={`/teams/${team.slug}`}>Gå til lag</Link>
          </article>
        ))}
      </div>
    </section>
  );

  return (
    <div className="stack">
      <h1>Lag</h1>
      {renderGroup("Aldersbestemt", youthTeams)}
      {renderGroup("Senior", seniorTeams)}
    </div>
  );
}
