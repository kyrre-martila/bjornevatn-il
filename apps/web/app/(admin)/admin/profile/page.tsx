import { getMe } from "../../../../lib/me";
import { ProfileClient } from "./ProfileClient";

export default async function AdminProfilePage() {
  const me = await getMe();
  const user = me?.user ?? null;

  if (!user) {
    return (
      <section className="profile">
        <div className="profile__not-logged-in">
          <h1 className="profile__title">Profile</h1>
          <p className="profile__subtitle">
            You are not logged in. Please sign in to view your account details.
          </p>
          <a href="/login" className="button-primary">
            Log in
          </a>
        </div>
      </section>
    );
  }

  return <ProfileClient initialUser={user} />;
}
