import Link from "next/link";

import { getMe } from "apps/web/lib/me";

function getInitialsFromUser(user: {
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  email: string;
}): string {
  if (user.firstName || user.lastName) {
    const first = user.firstName?.[0] ?? "";
    const last = user.lastName?.[0] ?? "";
    const initials = (first + last).trim();
    if (initials) return initials.toUpperCase();
  }

  if (user.displayName) {
    return user.displayName.charAt(0).toUpperCase();
  }

  return user.email.charAt(0).toUpperCase();
}

export default async function Profile() {
  const me = await getMe();
  const user = me?.user ?? null;

  if (!user) {
    return (
      <div className="app-main-empty">
        <p>You are not logged in.</p>
        <Link href="/login">Go to login</Link>
      </div>
    );
  }

  const displayName = user.displayName || user.email;
  const initials = getInitialsFromUser(user);
  const formattedCreated = new Date(user.createdAt).toLocaleDateString();

  return (
    <div className="profile">
      <div className="profile__header">
        <div className="profile__avatar">{initials}</div>
        <h1 className="profile__name">{displayName}</h1>
        <p className="profile__email">{user.email}</p>
      </div>

      <div className="profile__section">
        <h2 className="profile__section-title">Profile details</h2>

        <div className="profile__details">
          <div className="profile__detail">
            <span>First name</span>
            <strong>{user.firstName ?? "-"}</strong>
          </div>
          <div className="profile__detail">
            <span>Last name</span>
            <strong>{user.lastName ?? "-"}</strong>
          </div>
          <div className="profile__detail">
            <span>Email</span>
            <strong>{user.email}</strong>
          </div>
          <div className="profile__detail">
            <span>Phone</span>
            <strong>{user.phone ?? "-"}</strong>
          </div>
          <div className="profile__detail">
            <span>Birth date</span>
            <strong>{user.birthDate ?? "-"}</strong>
          </div>
          <div className="profile__detail">
            <span>Role</span>
            <strong>{user.role}</strong>
          </div>
          <div className="profile__detail">
            <span>Created</span>
            <strong>{formattedCreated}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
