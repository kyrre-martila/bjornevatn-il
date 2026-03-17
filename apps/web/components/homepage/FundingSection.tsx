import type { FundingGrantItem } from "../../lib/content";

type FundingSectionProps = {
  title: string;
  items: FundingGrantItem[];
};

export default function FundingSection({ title, items }: FundingSectionProps) {
  return (
    <section className="homepage-funding stack stack--sm" aria-labelledby="homepage-funding-title">
      <h2 id="homepage-funding-title">{title}</h2>
      <div className="homepage-funding__grid">
        {items.map((item) => (
          <article key={item.id} className="homepage-funding__card stack stack--sm">
            {item.image ? (
              <img className="homepage-funding__image" src={item.image} alt={item.title} />
            ) : null}
            <h3>{item.title}</h3>
            <p>{item.year}</p>
            <p>{item.amount}</p>
            <p>{item.description}</p>
            <p>{item.category}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
