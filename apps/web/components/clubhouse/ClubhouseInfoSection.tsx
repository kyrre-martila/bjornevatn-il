import type { ClubProfile } from "../../lib/content";

type ClubhouseInfoSectionProps = {
  club: ClubProfile | null;
};

export default function ClubhouseInfoSection({ club }: ClubhouseInfoSectionProps) {
  return (
    <section className="clubhouse-info section" aria-labelledby="clubhouse-practical-info-title">
      <div className="container container--md stack stack--sm">
        <h2 id="clubhouse-practical-info-title">Practical info</h2>
        <dl className="clubhouse-info__list">
          <div className="clubhouse-info__item">
            <dt>Name</dt>
            <dd>{club?.clubhouseName || club?.name || "Bjørnevatn IL clubhouse"}</dd>
          </div>
          <div className="clubhouse-info__item">
            <dt>Address</dt>
            <dd>{club?.clubhouseAddress || "Contact us to confirm the latest clubhouse address."}</dd>
          </div>
          <div className="clubhouse-info__item">
            <dt>Rental price</dt>
            <dd>{club?.clubhouseRentalPrice || "Rental pricing is provided when we review your request."}</dd>
          </div>
          <div className="clubhouse-info__item">
            <dt>Rental rules</dt>
            <dd>{club?.clubhouseRentalRules || "Standard clubhouse rules are shared before approval."}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
