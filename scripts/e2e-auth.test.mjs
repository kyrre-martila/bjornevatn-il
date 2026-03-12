/* Minimal E2E: register -> login -> me -> logout (no refresh token flow) */
const origin = process.env.API_URL || "http://localhost:4000";
const basePath = process.env.API_BASE_PATH || "/api/v1";
const normalizedBasePath = basePath.endsWith("/")
  ? basePath.slice(0, -1)
  : basePath;
const base = `${origin}${normalizedBasePath}`;
const uname = "user" + Math.random().toString(16).slice(2, 7);
const pw = "S3curePassw0rd!";

function must(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function json(url, opts = {}) {
  const r = await fetch(url, {
    headers: { "content-type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  const body = await r.json().catch(() => ({}));
  return { status: r.status, headers: r.headers, body };
}

(async () => {
  // register
  let r = await json(`${base}/auth/register`, {
    method: "POST",
    body: JSON.stringify({
      email: `${uname}@ex.com`,
      password: pw,
      name: `User ${uname}`,
    }),
  });
  must(r.status === 201, `register failed (${r.status})`);
  must(r.body.accessToken && r.body.user, "register response missing {user, accessToken}");
  must(!("refreshToken" in r.body), "register unexpectedly returned refreshToken");

  // login
  r = await json(`${base}/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email: `${uname}@ex.com`, password: pw }),
  });
  must(r.status === 200, `login failed (${r.status})`);
  must(r.body.accessToken && r.body.user, "login response missing {user, accessToken}");
  must(!("refreshToken" in r.body), "login unexpectedly returned refreshToken");

  const accessToken = r.body.accessToken;

  // me with bearer token
  const me = await fetch(`${base}/me`, {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });
  const meBody = await me.json();
  must(me.status === 200 && meBody.user, "/me with bearer token failed");

  // logout revokes server-side session
  const logout = await fetch(`${base}/auth/logout`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });
  const logoutBody = await logout.json().catch(() => ({}));
  must(logout.status === 200 && logoutBody.success === true, "logout failed");

  // old token should now be invalid
  const revoked = await fetch(`${base}/me`, {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });
  must(revoked.status === 401, `revoked token unexpectedly accepted (${revoked.status})`);

  console.log("✅ E2E auth session lifecycle OK");
})().catch((e) => {
  console.error("❌ E2E failed:", e.message);
  process.exit(1);
});
