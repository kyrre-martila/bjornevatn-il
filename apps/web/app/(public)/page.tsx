import Link from "next/link";

import { getHomepageContent } from "../../lib/content";

export default async function Homepage() {
  const content = await getHomepageContent();

  return (
    <section aria-labelledby="hero-heading" className="hero">
      <p className="hero__eyebrow">{content.eyebrow}</p>
      <h1 id="hero-heading" className="hero__title">
        {content.title}
      </h1>
      <p className="hero__subtitle">{content.subtitle}</p>
      <div className="hero__cta-row">
        <Link href={content.primaryCta.href} className="button-primary">
          {content.primaryCta.label}
        </Link>
        <Link href={content.secondaryCta.href} className="button-secondary">
          {content.secondaryCta.label}
        </Link>
      </div>
    </section>
  );
}
