import ClubhouseHero from "../../../components/clubhouse/ClubhouseHero";
import ClubhouseInfoSection from "../../../components/clubhouse/ClubhouseInfoSection";
import ClubhouseBookingForm from "../../../components/clubhouse/ClubhouseBookingForm";
import { getClubProfile } from "../../../lib/content";

export default async function ClubhousePage() {
  const club = await getClubProfile();

  return (
    <div className="clubhouse-page">
      <section className="section">
        <div className="container container--md">
          <ClubhouseHero club={club} />
        </div>
      </section>
      <ClubhouseInfoSection club={club} />
      <ClubhouseBookingForm />
    </div>
  );
}
