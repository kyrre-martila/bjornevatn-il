import { getSponsors } from "../lib/content";

const sponsorTypes = [
  "generalsponsor",
  "hovedsponsor",
  "sponsor",
  "samarbeidspartner",
] as const;

export default async function SponsorsSection() {
  const sponsors = await getSponsors();

  return (
    <section className="stack">
      <h2>Sponsorer</h2>
      {sponsorTypes.map((type) => {
        const entries = sponsors
          .filter((sponsor) => sponsor.type === type)
          .sort((a, b) => a.sortOrder - b.sortOrder);

        if (!entries.length) {
          return null;
        }

        return (
          <div key={type} className="stack stack--sm">
            <h3>{type}</h3>
            <div className="cluster">
              {entries.map((sponsor) => {
                const logo = sponsor.logo ? (
                  <img
                    src={sponsor.logo}
                    alt={sponsor.name}
                    style={{ height: "64px", width: "auto", objectFit: "contain" }}
                  />
                ) : (
                  <span>{sponsor.name}</span>
                );

                return sponsor.websiteUrl ? (
                  <a key={sponsor.id} href={sponsor.websiteUrl}>
                    {logo}
                  </a>
                ) : (
                  <div key={sponsor.id}>{logo}</div>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
