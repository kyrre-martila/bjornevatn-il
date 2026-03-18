import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getTeamBySlug } from "../../../../lib/content";
import { buildMetadata } from "../../../../lib/seo";
import { measureServerTiming } from "../../../../lib/observability";

const socialIconByPlatform: Record<string, string> = {
  facebook: "📘",
  instagram: "📸",
  youtube: "▶️",
  x: "𝕏",
  tiktok: "🎵",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const team = await measureServerTiming(
    {
      flow: "teams_detail_load",
      route: `/teams/${slug}`,
      module: "teams",
      metadata: { slug },
    },
    () => getTeamBySlug(slug),
  );
  if (!team) return {};

  return buildMetadata({
    pageTitle: `${team.name} | Bjørnevatn IL`,
    pageDescription: team.seoDescription ?? team.shortDescription,
    seoTitle: team.seoTitle,
    seoDescription: team.seoDescription,
    seoImage: team.seoImage ?? team.teamImage,
    seoCanonicalUrl: team.seoCanonicalUrl,
    seoNoIndex: team.seoNoIndex,
    path: `/teams/${team.slug}`,
  });
}

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const team = await measureServerTiming(
    {
      flow: "teams_detail_load",
      route: `/teams/${slug}`,
      module: "teams",
      metadata: { slug },
    },
    () => getTeamBySlug(slug),
  );

  if (!team) {
    notFound();
  }

  return (
    <div className="stack">
      <header className="stack">
        <h1>{team.name}</h1>
        {team.teamImage ? (
          <img
            src={team.teamImage}
            alt={team.name}
            style={{ maxWidth: "720px", width: "100%", borderRadius: "8px" }}
          />
        ) : null}
        <p>{team.description}</p>
      </header>

      <section className="stack">
        <h2>Informasjon</h2>
        {team.spondUrl ? <a href={team.spondUrl}>Spond</a> : null}
        {team.fotballNoUrl ? <a href={team.fotballNoUrl}>Fotball.no</a> : null}
      </section>

      <section className="stack">
        <h2>Trenere</h2>
        <div className="grid grid--2">
          {team.coaches.map((coach) => (
            <article
              key={`${coach.name}-${coach.role}`}
              className="public-block stack"
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                padding: "1rem",
              }}
            >
              {coach.image ? (
                <img
                  src={coach.image}
                  alt={coach.name}
                  style={{ width: "100%", borderRadius: "6px" }}
                />
              ) : null}
              <h3>{coach.name}</h3>
              <p>{coach.role}</p>
              <p>{coach.phone}</p>
              <p>{coach.email}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="stack">
        <h2>Treningstider</h2>
        <table>
          <thead>
            <tr>
              <th>Dag</th>
              <th>Start</th>
              <th>Slutt</th>
              <th>Sted</th>
              <th>Notater</th>
            </tr>
          </thead>
          <tbody>
            {team.trainingSessions.map((session) => (
              <tr
                key={`${session.dayOfWeek}-${session.startTime}-${session.location}`}
              >
                <td>{session.dayOfWeek}</td>
                <td>{session.startTime}</td>
                <td>{session.endTime}</td>
                <td>{session.location}</td>
                <td>{session.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="stack">
        <h2>Sosiale medier</h2>
        <div className="cluster">
          {team.socialLinks.map((social) => (
            <a key={`${social.platform}-${social.url}`} href={social.url}>
              {socialIconByPlatform[social.platform.toLowerCase()] ?? "🔗"}{" "}
              {social.platform}
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
