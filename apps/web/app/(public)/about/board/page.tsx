import { getPersonRoles } from "../../../../lib/content";

const categories = ["styret", "trenere", "andre-roller", "utvalg"] as const;

export default async function AboutBoardPage() {
  const roles = await getPersonRoles();

  return (
    <div className="stack">
      <h1>Styret og roller</h1>
      {categories.map((category) => {
        const entries = roles
          .filter((role) => role.category === category)
          .sort((a, b) => a.sortOrder - b.sortOrder);

        return (
          <section key={category} className="stack">
            <h2>{category}</h2>
            <div className="grid grid--2">
              {entries.map((entry) => (
                <article key={entry.id} className="public-block stack" style={{ border: "1px solid var(--color-border)", borderRadius: "8px", padding: "1rem" }}>
                  {entry.image ? (
                    <img src={entry.image} alt={entry.fullName} style={{ width: "100%", borderRadius: "6px" }} />
                  ) : null}
                  <h3>{entry.fullName}</h3>
                  <p>{entry.roleTitle}</p>
                  <p>{entry.email}</p>
                  <p>{entry.phone}</p>
                  <p>{entry.description}</p>
                  <p>{entry.termPeriod}</p>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
