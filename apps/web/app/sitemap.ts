import type { MetadataRoute } from "next";

import {
  getClubNews,
  getContentItemPath,
  getMatches,
  getPagePath,
  getSiteConfiguration,
  getSitemapContentItems,
  getSitemapPages,
  getTeams,
} from "../lib/content";

function normalizeUrl(baseUrl: string, path: string) {
  return new URL(path, `${baseUrl}/`).toString();
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { siteUrl: baseUrl } = await getSiteConfiguration();
  const [pages, contentItems, teams, news, matches] = await Promise.all([
    getSitemapPages(),
    getSitemapContentItems(),
    getTeams(),
    getClubNews(),
    getMatches(),
  ]);

  const staticEntries: MetadataRoute.Sitemap = ["/", "/teams", "/news", "/clubhouse", "/membership", "/tickets", "/about"].map((path) => ({
    url: normalizeUrl(baseUrl, path),
    lastModified: new Date(),
  }));

  const pageEntries = pages
    .filter((page) => !page.noIndex)
    .map((page) => {
      const fallbackPath = getPagePath(page.slug) ?? "/";

      return {
        url: page.canonicalUrl?.trim() || normalizeUrl(baseUrl, fallbackPath),
        lastModified: new Date(page.updatedAt),
      };
    });

  const contentEntries = contentItems
    .filter((item) => !item.noIndex)
    .map((item) => {
      const fallbackPath = getContentItemPath(item.contentTypeSlug, item.slug);

      return {
        url:
          item.canonicalUrl?.trim() ||
          normalizeUrl(baseUrl, fallbackPath ?? `/${item.contentTypeSlug}`),
        lastModified: new Date(item.updatedAt),
      };
    });

  const teamEntries = teams.filter((team) => !team.seoNoIndex).map((team) => ({
    url: team.seoCanonicalUrl?.trim() || normalizeUrl(baseUrl, `/teams/${team.slug}`),
    lastModified: new Date(),
  }));

  const newsEntries = news.filter((item) => !item.seoNoIndex).map((item) => ({
    url: item.seoCanonicalUrl?.trim() || normalizeUrl(baseUrl, `/news/${item.slug}`),
    lastModified: new Date(item.publishedAt),
  }));

  const matchEntries = matches
    .filter((match) => !match.seoNoIndex && match.slug)
    .map((match) => ({
      url: match.seoCanonicalUrl?.trim() || normalizeUrl(baseUrl, `/match/${match.slug}`),
      lastModified: new Date(match.matchDate || Date.now()),
    }));

  return [...staticEntries, ...pageEntries, ...contentEntries, ...teamEntries, ...newsEntries, ...matchEntries];
}
