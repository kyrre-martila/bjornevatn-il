import Image from "next/image";
import Link from "next/link";

import { getContentItemPath } from "../../../lib/content";
import type { BaseTemplateProps } from "./template-types";

export function ServiceTemplate({
  children,
  title,
  service,
}: BaseTemplateProps) {
  return (
    <article className="stack">
      <header className="section stack stack--sm">
        <p className="news-list__meta">Service template example</p>
        {title ? <h1 className="public-block__title">{title}</h1> : null}
        {service?.shortDescription ? <p>{service.shortDescription}</p> : null}
      </header>

      <main className="section stack" aria-label="Service content">
        {service?.featuredImage ? (
          <Image
            src={service.featuredImage}
            alt={`${service.title} featured`}
            width={1200}
            height={800}
          />
        ) : null}

        {service?.body ? <p>{service.body}</p> : null}

        {service?.taxonomyTerms?.length ? (
          <section className="stack stack--sm">
            <h2>Service categories</h2>
            <ul>
              {service.taxonomyTerms.map((term) => (
                <li key={term}>{term}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {service?.relatedServices?.length ? (
          <section className="stack stack--sm">
            <h2>Related services</h2>
            <ul>
              {service.relatedServices.map((related) => (
                <li key={related.slug}>
                  <Link
                    href={
                      getContentItemPath("services", related.slug) ??
                      "/services"
                    }
                  >
                    {related.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {service?.childServices?.length ? (
          <section className="stack stack--sm">
            <h2>Child services</h2>
            <ul>
              {service.childServices.map((child) => (
                <li key={child.slug}>
                  <Link
                    href={
                      getContentItemPath("services", child.slug) ??
                      "/services"
                    }
                  >
                    {child.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {service?.callToActionLabel && service.callToActionUrl ? (
          <p>
            <Link href={service.callToActionUrl}>
              {service.callToActionLabel}
            </Link>
          </p>
        ) : null}

        {children}
      </main>

      <footer className="section">
        <p className="news-list__meta">
          Template fallback target: IndexTemplate
        </p>
      </footer>
    </article>
  );
}
