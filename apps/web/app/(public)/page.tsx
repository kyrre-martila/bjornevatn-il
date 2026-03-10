import Link from "next/link";

import { getHomepageContent, getPageContentBySlug } from "../../lib/content";
import { renderBlock } from "./page/[slug]/block-renderer";

export default async function Homepage() {
  const content = await getPageContentBySlug("home");

  if (!content) {
    const hero = await getHomepageContent();

    return (
      <section aria-labelledby="hero-heading" className="hero">
        <p className="hero__eyebrow">{hero.eyebrow}</p>
        <h1 id="hero-heading" className="hero__title">
          {hero.title}
        </h1>
        <p className="hero__subtitle">{hero.subtitle}</p>
        <div className="hero__cta-row">
          <Link href={hero.primaryCta.href} className="button-primary">
            {hero.primaryCta.label}
          </Link>
          <Link href={hero.secondaryCta.href} className="button-secondary">
            {hero.secondaryCta.label}
          </Link>
        </div>
      </section>
    );
  }

  const renderedBlocks = await Promise.all(
    content.blocks.map(async (block) => ({
      id: block.id,
      node: await renderBlock(block),
    })),
  );

  return (
    <article>
      {renderedBlocks.map((block) => (
        <div key={block.id}>{block.node}</div>
      ))}
    </article>
  );
}
