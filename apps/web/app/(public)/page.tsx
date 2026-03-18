import type { Metadata } from "next";
import FundingSection from "../../components/homepage/FundingSection";
import GrasrotSection from "../../components/homepage/GrasrotSection";
import HeroSection from "../../components/homepage/HeroSection";
import LatestNewsSection from "../../components/homepage/LatestNewsSection";
import WeatherSection from "../../components/homepage/WeatherSection";
import SponsorsSection from "../../components/SponsorsSection";
import {
  getClubNews,
  getClubProfile,
  getFundingGrants,
  getHomepageSettings,
  getMatches,
} from "../../lib/content";
import { buildMetadata } from "../../lib/seo";
import { getWeatherSnapshot } from "../../lib/services/weather";

function formatNorwegianDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("nb-NO", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

export async function generateMetadata(): Promise<Metadata> {
  const [settings, club] = await Promise.all([getHomepageSettings(), getClubProfile()]);
  return buildMetadata({
    pageTitle: settings?.heroTitle || club?.name || "Bjørnevatn IL",
    pageDescription: settings?.heroText || club?.description || "Official website of Bjørnevatn IL",
    seoTitle: club?.seoTitle,
    seoDescription: club?.seoDescription,
    seoImage: club?.seoImage || club?.heroImage || club?.logo,
    seoCanonicalUrl: club?.seoCanonicalUrl,
    seoNoIndex: club?.seoNoIndex,
    path: "/",
  });
}

export default async function HomePage() {
  const [settings, club, matches, news, funding] = await Promise.all([
    getHomepageSettings(),
    getClubProfile(),
    getMatches(30),
    getClubNews(6),
    getFundingGrants(30),
  ]);

  const upcomingHomeMatch = settings?.showNextMatchHero
    ? matches
        .filter((match) => match.isHomeMatch && new Date(match.matchDate) > new Date())
        .sort(
          (a, b) =>
            new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime(),
        )[0] ?? null
    : null;

  const heroTitle =
    settings?.heroTitle || (upcomingHomeMatch ? "Next Home Match" : club?.name || "Bjørnevatn IL");
  const heroText =
    settings?.heroText ||
    (upcomingHomeMatch
      ? `${upcomingHomeMatch.homeTeam} møter ${upcomingHomeMatch.awayTeam} ${formatNorwegianDate(upcomingHomeMatch.matchDate)} på ${upcomingHomeMatch.venue}.`
      : club?.description || "Velkommen til Bjørnevatn IL.");
  const heroImage = settings?.heroImage || club?.heroImage || null;

  const weather =
    settings?.showWeatherSection && club
      ? await getWeatherSnapshot({
          latitude: club.latitude,
          longitude: club.longitude,
        })
      : null;

  const latestNews = news
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 3);

  const featuredFunding = funding
    .filter((item) => item.isFeaturedOnHomepage)
    .sort(
      (a, b) =>
        a.sortOrder - b.sortOrder || Number(b.year || 0) - Number(a.year || 0),
    );

  const grasrotUrl =
    settings?.grasrotButtonUrl ||
    (club?.grasrotOrganizationNumber
      ? `https://www.norsk-tipping.no/grasrotandelen/din-mottaker/${club.grasrotOrganizationNumber}`
      : "https://www.norsk-tipping.no/grasrotandelen");

  return (
    <div className="homepage stack stack--lg">
      <HeroSection
        title={heroTitle}
        text={heroText}
        image={heroImage}
        matchLabel={
          upcomingHomeMatch
            ? `${upcomingHomeMatch.homeTeam} vs ${upcomingHomeMatch.awayTeam}`
            : club?.name || "Bjørnevatn IL"
        }
        matchDate={
          upcomingHomeMatch
            ? formatNorwegianDate(upcomingHomeMatch.matchDate)
            : "Kampdato annonseres snart"
        }
        venue={upcomingHomeMatch?.venue || club?.name || "Bjørneparken"}
      />

      {settings?.showWeatherSection && weather ? <WeatherSection weather={weather} /> : null}

      {settings?.showNewsSection ? (
        <LatestNewsSection
          title={settings.newsSectionTitle || "Latest News"}
          items={latestNews}
        />
      ) : null}

      {settings?.showGrasrotSection && club?.grasrotEnabled ? (
        <GrasrotSection
          title={
            settings.grasrotInstructionsTitle ||
            "Support Bjørnevatn IL with Grasrotandelen"
          }
          text={settings.grasrotInstructionsText}
          buttonLabel={settings.grasrotButtonLabel || "Become a Grasrot giver"}
          buttonUrl={grasrotUrl}
          organizationNumber={club.grasrotOrganizationNumber}
        />
      ) : null}

      {settings?.showFundingSection && featuredFunding.length ? (
        <FundingSection
          title={settings.fundingSectionTitle || "Support and Funding"}
          items={featuredFunding}
        />
      ) : null}

      {settings?.showSponsorsSection ? (
        <SponsorsSection title={settings.sponsorsSectionTitle || "Sponsors"} />
      ) : null}
    </div>
  );
}
