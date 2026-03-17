import Link from "next/link";

export default function Homepage() {
  return (
    <section aria-labelledby="club-heading" className="hero hero--public section stack">
      <div className="hero__inner stack">
        <p className="hero__eyebrow">Bjørnevatn, Norway</p>
        <h1 id="club-heading" className="hero__title">
          Bjørnevatn IL
        </h1>
        <p className="hero__text">Official Club Website</p>
        <p>
          Welcome to the placeholder homepage for the Bjørnevatn IL Website – powered by Content Blueprint
          architecture. Club content and feature pages will be added in upcoming iterations.
        </p>
        <nav aria-label="Homepage placeholder navigation" className="cluster">
          <Link href="#" className="button-primary" aria-disabled="true">
            Club Information (coming soon)
          </Link>
          <Link href="#" className="button-secondary" aria-disabled="true">
            Teams (coming soon)
          </Link>
          <Link href="#" className="button-secondary" aria-disabled="true">
            News (coming soon)
          </Link>
        </nav>
      </div>
    </section>
  );
}
