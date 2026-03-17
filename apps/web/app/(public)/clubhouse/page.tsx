import type { Metadata } from "next";
import ClubhouseHero from "../../../components/clubhouse/ClubhouseHero";
import ClubhouseInfoSection from "../../../components/clubhouse/ClubhouseInfoSection";
import ClubhouseBookingForm from "../../../components/clubhouse/ClubhouseBookingForm";
import { getClubProfile } from "../../../lib/content";
import { buildJsonLd, buildMetadata, getSeoSettings } from "../../../lib/seo";


export async function generateMetadata(): Promise<Metadata> {
  const club = await getClubProfile();
  return buildMetadata({
    pageTitle: club?.clubhouseName || "Clubhouse",
    pageDescription: club?.clubhouseDescription || club?.description || "Clubhouse information",
    seoTitle: club?.seoTitle,
    seoDescription: club?.seoDescription,
    seoImage: club?.seoImage || club?.heroImage || club?.logo,
    seoCanonicalUrl: club?.seoCanonicalUrl,
    seoNoIndex: club?.seoNoIndex,
    path: "/clubhouse",
  });
}

export default async function ClubhousePage() {
  const [club, seo] = await Promise.all([getClubProfile(), getSeoSettings()]);

  const jsonLd = buildJsonLd({
    "@context": "https://schema.org",
    "@type": "SportsOrganization",
    name: club?.name || seo.siteTitle,
    address: club?.clubhouseAddress,
    logo: club?.logo || seo.defaultOgImage || undefined,
    sameAs: [seo.facebookPageUrl].filter(Boolean),
  });

  return (
    <div className="clubhouse-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <section className="section">
        <div className="container container--md">
          <ClubhouseHero club={club} />
        </div>
      </section>
      <ClubhouseInfoSection club={club} />
      <ClubhouseBookingForm />
    </div>
  );
}
