type PlaceholderPageProps = {
  title: string;
  description: string;
};

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <section className="section stack" aria-labelledby="page-title">
      <h1 id="page-title">{title}</h1>
      <p>{description}</p>
    </section>
  );
}
