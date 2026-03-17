import type { Metadata } from "next";

import { getSiteConfiguration, getPublicSiteSettings, withTitleSuffix } from "./content";

export type SeoSettings = {
  siteTitle: string;
  siteDescription: string;
  siteUrl: string;
  defaultOgImage: string | null;
  twitterHandle: string | null;
  facebookPageUrl: string | null;
  defaultMetaImage: string | null;
  defaultMetaTitleSuffix: string | null;
  robotsIndexEnabled: boolean;
  robotsFollowEnabled: boolean;
  googleVerificationCode: string | null;
  bingVerificationCode: string | null;
  favicon: string | null;
  appleTouchIcon: string | null;
  manifestIcon: string | null;
};

function normalizeBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (typeof value === "undefined") return defaultValue;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function absoluteUrl(siteUrl: string, pathOrUrl: string | null | undefined): string | null {
  const raw = pathOrUrl?.trim();
  if (!raw) return null;
  try {
    return new URL(raw, `${siteUrl}/`).toString();
  } catch {
    return null;
  }
}

export async function getSeoSettings(): Promise<SeoSettings> {
  const [siteConfig, settings] = await Promise.all([
    getSiteConfiguration(),
    getPublicSiteSettings(),
  ]);

  const siteTitle = (settings.site_title ?? settings.siteName ?? siteConfig.siteName).trim();
  const siteDescription = (settings.site_tagline ?? "Official website of Bjørnevatn IL").trim();
  const siteUrl = siteConfig.siteUrl;

  return {
    siteTitle,
    siteDescription,
    siteUrl,
    defaultOgImage: absoluteUrl(siteUrl, settings.defaultOgImage),
    twitterHandle: settings.twitter_handle?.trim() ?? null,
    facebookPageUrl: settings.facebookPageUrl?.trim() ?? settings.facebook_url?.trim() ?? null,
    defaultMetaImage: absoluteUrl(siteUrl, settings.defaultMetaImage ?? settings.defaultSeoImage),
    defaultMetaTitleSuffix: settings.defaultMetaTitleSuffix?.trim() ?? siteConfig.defaultTitleSuffix,
    robotsIndexEnabled: normalizeBoolean(settings.robotsIndexEnabled, !normalizeBoolean(settings.robots_noindex, false)),
    robotsFollowEnabled: normalizeBoolean(settings.robotsFollowEnabled, !normalizeBoolean(settings.robots_disallow_all, false)),
    googleVerificationCode: settings.googleVerificationCode?.trim() ?? null,
    bingVerificationCode: settings.bingVerificationCode?.trim() ?? null,
    favicon: absoluteUrl(siteUrl, settings.favicon),
    appleTouchIcon: absoluteUrl(siteUrl, settings.appleTouchIcon),
    manifestIcon: absoluteUrl(siteUrl, settings.manifestIcon),
  };
}

export type SeoInput = {
  pageTitle: string;
  pageDescription?: string | null;
  pageExcerpt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoImage?: string | null;
  seoCanonicalUrl?: string | null;
  seoNoIndex?: boolean;
  path?: string;
  ogType?: "website" | "article";
};

export async function buildMetadata(input: SeoInput): Promise<Metadata> {
  const settings = await getSeoSettings();
  const baseTitle = input.seoTitle?.trim() || input.pageTitle;
  const title = withTitleSuffix(baseTitle, settings.defaultMetaTitleSuffix);
  const description =
    input.seoDescription?.trim() || input.pageDescription?.trim() || input.pageExcerpt?.trim() || settings.siteDescription;
  const canonicalUrl =
    absoluteUrl(settings.siteUrl, input.seoCanonicalUrl) ||
    absoluteUrl(settings.siteUrl, input.path) ||
    settings.siteUrl;
  const image = absoluteUrl(settings.siteUrl, input.seoImage) || settings.defaultOgImage || settings.defaultMetaImage || undefined;

  const noIndex = Boolean(input.seoNoIndex) || !settings.robotsIndexEnabled;
  const follow = settings.robotsFollowEnabled;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: input.ogType ?? "website",
      siteName: settings.siteTitle,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
      creator: settings.twitterHandle ?? undefined,
    },
    robots: {
      index: !noIndex,
      follow,
    },
    verification: {
      google: settings.googleVerificationCode ?? undefined,
      other: settings.bingVerificationCode ? { "msvalidate.01": settings.bingVerificationCode } : undefined,
    },
  };
}

export function buildJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data);
}
