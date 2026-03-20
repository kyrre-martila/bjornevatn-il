export const dynamic = "force-dynamic";

export default function AdminAccessDeniedPage() {
  return (
    <section className="hero" aria-labelledby="access-denied-heading">
      <p className="hero__eyebrow">Admin</p>
      <h1 id="access-denied-heading" className="hero__title">
        Access denied
      </h1>
      <p className="hero__subtitle">
        Your account does not have permission to view this area. Contact a super
        admin if you need additional access.
      </p>
    </section>
  );
}
