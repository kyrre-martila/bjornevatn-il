import { getMe } from "../../../lib/me";

export default async function Profile() {
  const data = await getMe();
  return (
    <div style={{ padding: 24 }}>
      <h1>Profile</h1>
      <pre style={{ marginTop: 16 }}>
        {JSON.stringify(data?.user ?? null, null, 2)}
      </pre>
      <a href="/login">Log in</a>
    </div>
  );
}
