#!/usr/bin/env node

const apiOrigin = process.env.SMOKE_API_ORIGIN || "http://localhost:4000";
const webOrigin = process.env.SMOKE_WEB_ORIGIN || "http://localhost:3000";
const apiBasePath = process.env.SMOKE_API_BASE_PATH || "/api/v1";
const adminEmail = process.env.SMOKE_ADMIN_EMAIL || "admin@example.com";
const adminPassword = process.env.SMOKE_ADMIN_PASSWORD;
const editorEmail = process.env.SMOKE_EDITOR_EMAIL || "editor@example.com";
const editorPassword = process.env.SMOKE_EDITOR_PASSWORD;
const superAdminEmail =
  process.env.SMOKE_SUPERADMIN_EMAIL || "superadmin@example.com";
const superAdminPassword = process.env.SMOKE_SUPERADMIN_PASSWORD;
const pushConfirmationToken = process.env.SMOKE_STAGING_PUSH_CONFIRMATION_TOKEN;
const requestTimeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 10000);

const normalizedApiBasePath = apiBasePath.endsWith("/")
  ? apiBasePath.slice(0, -1)
  : apiBasePath;
const apiBaseUrl = `${apiOrigin}${normalizedApiBasePath}`;

if (!adminPassword) {
  console.error("❌ Missing required env var: SMOKE_ADMIN_PASSWORD");
  process.exit(1);
}

if (!editorPassword) {
  console.error("❌ Missing required env var: SMOKE_EDITOR_PASSWORD");
  process.exit(1);
}

if (!superAdminPassword) {
  console.error("❌ Missing required env var: SMOKE_SUPERADMIN_PASSWORD");
  process.exit(1);
}

function ensureOk(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function withTimeout(signal, ms) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);

  signal?.addEventListener("abort", () => controller.abort(), { once: true });

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
  };
}

async function requestJson(url, options = {}) {
  const timeout = withTimeout(options.signal, requestTimeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: timeout.signal,
      headers: {
        "content-type": "application/json",
        ...(options.headers || {}),
      },
    });

    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    return {
      response,
      body,
    };
  } finally {
    timeout.clear();
  }
}

function extractCookie(response, cookieName) {
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) {
    return null;
  }

  const firstCookie = setCookie
    .split(",")
    .find((chunk) => chunk.trimStart().startsWith(`${cookieName}=`));

  if (!firstCookie) {
    return null;
  }

  return firstCookie.split(";")[0].trim();
}

async function runCheck(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

let accessCookie;
let adminAccessToken;
let editorAccessToken;
let editorCookie;
let superAdminAccessToken;

await runCheck("API health endpoint", async () => {
  const { response, body } = await requestJson(`${apiOrigin}/health`);
  ensureOk(response.status === 200, `Expected 200, got ${response.status}`);
  ensureOk(
    typeof body === "object" && body !== null && body.status === "ok",
    `Unexpected health response: ${JSON.stringify(body)}`,
  );
});

await runCheck("Login endpoint", async () => {
  const { response, body } = await requestJson(`${apiBaseUrl}/auth/login`, {
    method: "POST",
    body: JSON.stringify({
      email: adminEmail,
      password: adminPassword,
    }),
  });

  ensureOk(response.status === 200, `Expected 200, got ${response.status}`);
  ensureOk(
    typeof body === "object" && body !== null && body.user,
    `Unexpected login response: ${JSON.stringify(body)}`,
  );

  accessCookie = extractCookie(response, "access");
  ensureOk(accessCookie, "Missing access cookie from login response");
  ensureOk(
    typeof body.accessToken === "string" && body.accessToken.length > 0,
    "Missing access token from login response",
  );
  adminAccessToken = body.accessToken;
});

async function loginForRole(name, email, password) {
  const { response, body } = await requestJson(`${apiBaseUrl}/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  ensureOk(
    response.status === 200,
    `${name}: expected 200, got ${response.status}`,
  );
  ensureOk(
    typeof body === "object" && body !== null && body.user,
    `${name}: unexpected login response ${JSON.stringify(body)}`,
  );

  const token = body.accessToken;
  ensureOk(
    typeof token === "string" && token.length > 0,
    `${name}: missing accessToken in login response`,
  );

  return {
    accessToken: token,
    accessCookie: extractCookie(response, "access"),
  };
}

await runCheck("Editor login endpoint", async () => {
  const login = await loginForRole("editor", editorEmail, editorPassword);
  editorAccessToken = login.accessToken;
  editorCookie = login.accessCookie;
  ensureOk(editorCookie, "Editor login missing access cookie");
});

await runCheck("Superadmin login endpoint", async () => {
  const login = await loginForRole(
    "superadmin",
    superAdminEmail,
    superAdminPassword,
  );
  superAdminAccessToken = login.accessToken;
});

await runCheck("Admin authentication", async () => {
  const { response, body } = await requestJson(`${apiBaseUrl}/content/pages`, {
    headers: {
      cookie: accessCookie,
    },
  });

  ensureOk(response.status === 200, `Expected 200, got ${response.status}`);
  ensureOk(Array.isArray(body), `Unexpected admin response body`);
});

await runCheck("Public content endpoint", async () => {
  const { response, body } = await requestJson(
    `${apiBaseUrl}/public/content/pages`,
  );
  ensureOk(response.status === 200, `Expected 200, got ${response.status}`);
  ensureOk(Array.isArray(body), `Unexpected public content response body`);
});

await runCheck("Staging status endpoint (admin allowed)", async () => {
  const { response, body } = await requestJson(
    `${apiBaseUrl}/admin/staging/status`,
    {
      headers: {
        authorization: `Bearer ${adminAccessToken}`,
      },
    },
  );

  ensureOk(response.status === 200, `Expected 200, got ${response.status}`);
  ensureOk(
    typeof body === "object" && body !== null,
    "Expected JSON status object",
  );
});

await runCheck("Staging page access with auth (editor)", async () => {
  const timeout = withTimeout(undefined, requestTimeoutMs);

  try {
    const response = await fetch(`${webOrigin}/admin/staging`, {
      headers: {
        cookie: editorCookie,
      },
      redirect: "manual",
      signal: timeout.signal,
    });

    ensureOk(
      response.status !== 401,
      `Expected non-401 with auth cookie, got ${response.status}`,
    );
  } finally {
    timeout.clear();
  }
});

await runCheck("Editor cannot access staging status", async () => {
  const { response } = await requestJson(`${apiBaseUrl}/admin/staging/status`, {
    headers: {
      authorization: `Bearer ${editorAccessToken}`,
    },
  });

  ensureOk(response.status === 403, `Expected 403, got ${response.status}`);
});

await runCheck("Reset-from-live endpoint authorization", async () => {
  const { response } = await requestJson(
    `${apiBaseUrl}/admin/staging/reset-from-live`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${adminAccessToken}`,
      },
      body: JSON.stringify({}),
    },
  );

  ensureOk(
    response.status === 403,
    `Expected 403 for admin role, got ${response.status}`,
  );
});

await runCheck("Push-to-live endpoint authorization", async () => {
  const { response } = await requestJson(
    `${apiBaseUrl}/admin/staging/push-to-live`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${adminAccessToken}`,
      },
      body: JSON.stringify({
        confirmPushToLive: true,
        confirmationToken: pushConfirmationToken,
      }),
    },
  );

  ensureOk(
    response.status === 403,
    `Expected 403 for admin role, got ${response.status}`,
  );
});

await runCheck("Delete staging endpoint authorization", async () => {
  const { response } = await requestJson(`${apiBaseUrl}/admin/staging`, {
    method: "DELETE",
    headers: {
      authorization: `Bearer ${adminAccessToken}`,
    },
  });

  ensureOk(
    response.status === 403,
    `Expected 403 for admin role, got ${response.status}`,
  );
});

await runCheck("Superadmin can run staging actions (authz)", async () => {
  const reset = await requestJson(
    `${apiBaseUrl}/admin/staging/reset-from-live`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${superAdminAccessToken}`,
      },
      body: JSON.stringify({}),
    },
  );
  ensureOk(
    reset.response.status !== 401 && reset.response.status !== 403,
    `Expected superadmin to be authorized for reset, got ${reset.response.status}`,
  );

  const push = await requestJson(`${apiBaseUrl}/admin/staging/push-to-live`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${superAdminAccessToken}`,
    },
    body: JSON.stringify({
      confirmPushToLive: true,
      confirmationToken: pushConfirmationToken,
    }),
  });
  ensureOk(
    push.response.status !== 401 && push.response.status !== 403,
    `Expected superadmin to be authorized for push, got ${push.response.status}`,
  );

  const deleteResponse = await requestJson(`${apiBaseUrl}/admin/staging`, {
    method: "DELETE",
    headers: {
      authorization: `Bearer ${superAdminAccessToken}`,
    },
  });
  ensureOk(
    deleteResponse.response.status !== 401 &&
      deleteResponse.response.status !== 403,
    `Expected superadmin to be authorized for delete, got ${deleteResponse.response.status}`,
  );
});

await runCheck("Sitemap endpoint", async () => {
  const timeout = withTimeout(undefined, requestTimeoutMs);

  try {
    const response = await fetch(`${webOrigin}/sitemap.xml`, {
      signal: timeout.signal,
    });
    const body = await response.text();

    ensureOk(response.status === 200, `Expected 200, got ${response.status}`);
    ensureOk(
      body.includes("<urlset") || body.includes("<sitemapindex"),
      "Sitemap response is not valid XML sitemap output",
    );
  } finally {
    timeout.clear();
  }
});

console.log("\n🎉 Smoke test completed successfully.");
