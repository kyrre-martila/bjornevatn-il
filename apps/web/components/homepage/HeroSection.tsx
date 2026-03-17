import { ImageAsset } from "../media/ImageAsset";
import Link from "next/link";

type HeroSectionProps = {
  title: string;
  text: string;
  image: string | null;
  matchLabel: string;
  matchDate: string;
  venue: string;
};

export default function HeroSection({
  title,
  text,
  image,
  matchLabel,
  matchDate,
  venue,
}: HeroSectionProps) {
  return (
    <section className="homepage-hero stack" aria-labelledby="homepage-hero-title">
      {image ? (
        <ImageAsset className="homepage-hero__image" imageClassName="homepage-hero__image" src={image} alt={title} loading="eager" />
      ) : null}
      <div className="homepage-hero__content stack stack--sm">
        <p className="homepage-hero__eyebrow">Kommende kamp</p>
        <h1 id="homepage-hero-title" className="homepage-hero__title">
          {title}
        </h1>
        <p className="homepage-hero__text">{text}</p>
        <dl className="homepage-hero__meta">
          <div>
            <dt>Kamp</dt>
            <dd>{matchLabel}</dd>
          </div>
          <div>
            <dt>Dato</dt>
            <dd>{matchDate}</dd>
          </div>
          <div>
            <dt>Sted</dt>
            <dd>{venue}</dd>
          </div>
        </dl>
        <div className="homepage-hero__actions">
          <Link className="button-primary" href="/tickets">
            Buy Tickets
          </Link>
          <Link className="button-secondary" href="/membership">
            Become Member
          </Link>
        </div>
      </div>
    </section>
  );
}
