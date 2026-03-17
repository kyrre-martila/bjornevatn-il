import { getClubNews, getClubProfile, getTeams } from "../../../../lib/content";
import { buildMetadata } from "../../../../lib/seo";

export default async function SeoPreviewPage() {
  const [news, teams, club] = await Promise.all([
    getClubNews(),
    getTeams(),
    getClubProfile(),
  ]);

  const sample = {
    pageTitle: news[0]?.title || teams[0]?.name || club?.name || "Bjørnevatn IL",
    pageDescription:
      news[0]?.excerpt || teams[0]?.shortDescription || club?.description || "SEO preview",
    seoImage: news[0]?.image || teams[0]?.teamImage || club?.logo || null,
    path: "/admin/seo-preview",
  };

  const metadata = await buildMetadata(sample);

  return (
    <section className="seo-preview seo-preview--page section">
      <div className="container container--md stack stack--sm seo-preview__container">
        <h1 className="seo-preview__title">SEO Preview</h1>
        <p className="seo-preview__description">Preview title/description and social snippets.</p>

        <article className="seo-preview__card seo-preview-card">
          <h2 className="seo-preview-card__title">Search snippet</h2>
          <p className="seo-preview-card__meta">{String(metadata.alternates?.canonical ?? "")}</p>
          <h3 className="seo-preview-card__headline">{String(metadata.title ?? "")}</h3>
          <p className="seo-preview-card__text">{metadata.description}</p>
        </article>

        <article className="seo-preview__card seo-preview-card">
          <h2 className="seo-preview-card__title">Open Graph preview</h2>
          <h3 className="seo-preview-card__headline">{metadata.openGraph?.title as string}</h3>
          <p className="seo-preview-card__text">{metadata.openGraph?.description}</p>
          <p className="seo-preview-card__meta">Open Graph</p>
        </article>

        <article className="seo-preview__card seo-preview-card">
          <h2 className="seo-preview-card__title">Twitter preview</h2>
          <h3 className="seo-preview-card__headline">{metadata.twitter?.title as string}</h3>
          <p className="seo-preview-card__text">{metadata.twitter?.description}</p>
          <p className="seo-preview-card__meta">summary_large_image</p>
        </article>
      </div>
    </section>
  );
}
