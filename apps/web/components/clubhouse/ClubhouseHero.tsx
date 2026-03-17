import type { ClubProfile } from "../../lib/content";

type ClubhouseHeroProps = {
  club: ClubProfile | null;
};

export default function ClubhouseHero({ club }: ClubhouseHeroProps) {
  const title = "Clubhouse";
  const name = club?.clubhouseName || club?.name || "Bjørnevatn IL clubhouse";
  const description =
    club?.clubhouseDescription ||
    club?.description ||
    "Our clubhouse is available for community events, private gatherings, and club activities.";
  const address = club?.clubhouseAddress || "Address is shared after booking inquiry.";
  const image = club?.heroImage;

  return (
    <section className="clubhouse-hero stack" aria-labelledby="clubhouse-title">
      {image ? <img className="clubhouse-hero__image" src={image} alt={name} /> : null}
      <div className="clubhouse-hero__content stack stack--sm">
        <h1 id="clubhouse-title" className="clubhouse-hero__title">
          {title}
        </h1>
        <p className="clubhouse-hero__lead">{name}</p>
        <p className="clubhouse-hero__description">{description}</p>
        <p className="clubhouse-hero__address">{address}</p>
      </div>
    </section>
  );
}
