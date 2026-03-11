import Link from "next/link";

import { getServicesListing } from "../../../lib/content";

export default async function ServicesArchivePage() {
  const services = await getServicesListing();

  return (
    <section className="public-block section stack">
      <h1 className="public-block__title">Services</h1>
      <p>
        This archive demonstrates listing ContentItems from the Services
        ContentType.
      </p>
      <ul className="news-list news-list--page stack">
        {services.map((service) => (
          <li key={service.id} className="news-list__item stack">
            <h2 className="news-list__title">{service.title}</h2>
            {service.shortDescription ? (
              <p className="news-list__excerpt">{service.shortDescription}</p>
            ) : null}
            {service.childCount > 0 ? (
              <p className="news-list__meta">
                Includes {service.childCount} child services.
              </p>
            ) : null}
            <Link
              href={`/services/${service.slug}`}
              className="news-list__link"
            >
              View service
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
