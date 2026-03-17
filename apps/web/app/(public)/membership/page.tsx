import type { Metadata } from "next";
import { buildMetadata } from "../../../lib/seo";
import MembershipApplicationForm from "../../../components/membership/MembershipApplicationForm";
import { getMembershipSettings, listMembershipCategories } from "../../../lib/membership";


export async function generateMetadata(): Promise<Metadata> {
  const settings = await getMembershipSettings();
  return buildMetadata({
    pageTitle: settings?.pageTitle || "Membership",
    pageDescription: settings?.introText || "Become a member of Bjørnevatn IL",
    path: "/membership",
  });
}

export default async function MembershipPage() {
  const [settings, categories] = await Promise.all([
    getMembershipSettings(),
    listMembershipCategories(),
  ]);

  if (!settings) {
    return (
      <section className="section">
        <div className="container container--md">
          <h1 className="hero__title">Become a member</h1>
          <p>Membership information is currently unavailable.</p>
        </div>
      </section>
    );
  }

  return (
    <div className="membership-page">
      <section className="section">
        <div className="container container--md stack stack--sm">
          <h1 className="hero__title">{settings.pageTitle}</h1>
          <p className="membership-page__intro">{settings.introText}</p>
          {settings.contactEmail ? <p className="membership-page__intro">Contact: <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a></p> : null}
        </div>
      </section>

      {settings.showBenefitsSection ? (
        <section className="section">
          <div className="container container--md stack stack--sm">
            <h2>{settings.benefitsTitle}</h2>
            <ul className="membership-page__benefits">
              {settings.benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}
            </ul>
          </div>
        </section>
      ) : null}

      {settings.showCategoriesSection ? (
        <section className="section">
          <div className="container container--md stack stack--sm">
            <h2>{settings.categoriesTitle}</h2>
            <div className="membership-page__categories">
              {categories.map((category) => (
                <article key={category.id} className="membership-page__category-card">
                  <h3>{category.name}</h3>
                  <p>{category.description}</p>
                  <p><strong>{category.priceLabel}</strong></p>
                  <p>{category.ageGroup}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {settings.showApplicationForm ? (
        <section className="section">
          <div className="container container--md stack stack--sm">
            <h2>{settings.applicationTitle}</h2>
            <MembershipApplicationForm
              categories={categories.map((category) => ({ id: category.id, name: category.name }))}
              settings={{ confirmationTitle: settings.confirmationTitle, confirmationText: settings.confirmationText }}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
