import type { Metadata } from "next";
import Link from "next/link";

import {
  getHomepageContent,
  getPageContentBySlug,
  getSiteConfiguration,
  withTitleSuffix,
} from "../../lib/content";
import { renderBlock } from "./page/[slug]/block-renderer";
import { resolvePageTemplate } from "./templates/template-registry";

export async function generateMetadata(): Promise<Metadata> {
  const [content, siteConfig] = await Promise.all([
    getPageContentBySlug("home"),
    getSiteConfiguration(),
  ]);

  if (!content) {
    return {
      alternates: { canonical: new URL("/", `${siteConfig.siteUrl}/`).toString() },
    };
  }

  const title = withTitleSuffix(
    content.seoTitle?.trim() || content.title,
    siteConfig.defaultTitleSuffix,
  );

  return {
    title,
    description: content.seoDescription?.trim() || undefined,
    alternates: { canonical: new URL("/", `${siteConfig.siteUrl}/`).toString() },
    robots: content.noIndex ? { index: false, follow: true } : undefined,
  };
}

export default async function Homepage() {
  const content = await getPageContentBySlug("home");

  if (!content) {
    const hero = await getHomepageContent();

    return (
      <section aria-labelledby="hero-heading" className="hero hero--public section stack">
        <div className="hero__inner stack">
          <p className="hero__eyebrow">{hero.eyebrow}</p>
          <h1 id="hero-heading" className="hero__title">
            {hero.title}
          </h1>
          <p className="hero__text">{hero.subtitle}</p>
          <div className="hero__actions cluster">
            <Link href={hero.primaryCta.href} className="button-primary">
              {hero.primaryCta.label}
            </Link>
            <Link href={hero.secondaryCta.href} className="button-secondary">
              {hero.secondaryCta.label}
            </Link>
          </div>
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

  const Template = resolvePageTemplate(content.templateKey);

  return (
    <Template title={content.title}>
      {renderedBlocks.map((block) => (
        <div key={block.id}>{block.node}</div>
      ))}
    </Template>
  );
}
