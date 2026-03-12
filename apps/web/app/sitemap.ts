import type { MetadataRoute } from "next";

import {
  getContentItemPath,
  getPagePath,
  getSiteConfiguration,
  getSitemapContentItems,
  getSitemapPages,
} from "../lib/content";

function normalizeUrl(baseUrl: string, path: string) {
  return new URL(path, `${baseUrl}/`).toString();
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { siteUrl: baseUrl } = await getSiteConfiguration();
  const [pages, contentItems] = await Promise.all([
    getSitemapPages(),
    getSitemapContentItems(),
  ]);

  const pageEntries = pages
    .filter((page) => !page.noIndex)
    .map((page) => ({
      url: normalizeUrl(baseUrl, getPagePath(page.slug) ?? "/"),
      lastModified: new Date(page.updatedAt),
    }));

  const contentEntries = contentItems
    .filter((item) => !item.noIndex)
    .map((item) => {
      const fallbackPath = getContentItemPath(item.contentTypeSlug, item.slug);

      return {
        url: normalizeUrl(baseUrl, fallbackPath ?? `/${item.contentTypeSlug}`),
        lastModified: new Date(item.updatedAt),
      };
    });

  return [...pageEntries, ...contentEntries];
}
