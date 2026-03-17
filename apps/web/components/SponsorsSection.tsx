import { ImageAsset } from "./media/ImageAsset";
import { getSponsors } from "../lib/content";

const sponsorTypes = [
  "generalsponsor",
  "hovedsponsor",
  "sponsor",
  "samarbeidspartner",
] as const;

type SponsorsSectionProps = {
  title?: string;
};

export default async function SponsorsSection({ title = "Sponsors" }: SponsorsSectionProps) {
  const sponsors = await getSponsors();

  return (
    <section className="homepage-sponsors stack stack--sm" aria-labelledby="homepage-sponsors-title">
      <h2 id="homepage-sponsors-title">{title}</h2>
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
            <div className="homepage-sponsors__logos">
              {entries.map((sponsor) => {
                const logo = sponsor.logo ? (
                  <ImageAsset
                    src={sponsor.logo}
                    alt={sponsor.name}
                    className="homepage-sponsors__logo"
                    imageClassName="homepage-sponsors__logo"
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
