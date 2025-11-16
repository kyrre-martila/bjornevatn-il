export default function HomePage() {
  return (
    <section aria-labelledby="hero-heading" className="hero">
      <p className="hero__eyebrow">Starter kit</p>

      <h1 id="hero-heading" className="hero__title">
        Hello world. Release your fantasy.
      </h1>

      <p className="hero__subtitle">
        This fullstack blueprint gives you a clean foundation for web, API and mobile —
        with shared design tokens, architecture and room for vibecoding.
      </p>

      <div className="hero__cta-row">
        <button type="button" className="button-primary">Start building</button>
        <button type="button" className="button-secondary">Explore the code</button>
      </div>
    </section>
  );
}
