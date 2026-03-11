import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import {
  getSiteConfiguration,
  resolveServiceBySlug,
  withTitleSuffix,
} from "../../../../lib/content";
import { resolveContentTypeTemplate } from "../../templates/template-registry";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [resolved, siteConfig] = await Promise.all([
    resolveServiceBySlug(slug),
    getSiteConfiguration(),
  ]);

  if (resolved.redirectTo) {
    return { title: "Redirecting" };
  }

  const item = resolved.item;
  if (!item) {
    return { title: "Not found" };
  }

  const canonicalUrl =
    item.canonicalUrl ??
    new URL(`/services/${item.slug}`, `${siteConfig.siteUrl}/`).toString();
  const title = withTitleSuffix(item.title, siteConfig.defaultTitleSuffix);

  return {
    title,
    description: item.shortDescription,
    alternates: { canonical: canonicalUrl },
    robots: item.noIndex ? { index: false, follow: true } : undefined,
  };
}

export default async function ServiceItemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const resolved = await resolveServiceBySlug(slug);

  if (resolved.redirectTo) {
    permanentRedirect(resolved.redirectTo);
  }

  const item = resolved.item;

  if (!item) {
    notFound();
  }

  const Template = resolveContentTypeTemplate(item.templateKey);

  return <Template title={item.title} service={item} />;
}
