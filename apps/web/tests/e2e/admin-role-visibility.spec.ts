import { expect, test } from "@playwright/test";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";

const API_PORT = 4000;
const API_PREFIX = "/api/v1";

type JsonHandler = (req: IncomingMessage) => { status?: number; body: unknown };

class MockAdminApi {
  private readonly routes = new Map<string, JsonHandler>();
  private server = createServer((req, res) => this.handle(req, res));

  async start() {
    await new Promise<void>((resolve) => this.server.listen(API_PORT, resolve));
  }

  async stop() {
    await new Promise<void>((resolve, reject) =>
      this.server.close((error) => (error ? reject(error) : resolve())),
    );
  }

  json(path: string, body: unknown, status = 200) {
    this.routes.set(`${API_PREFIX}${path}`, () => ({ status, body }));
  }

  private handle(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${API_PORT}`);
    const key = `${url.pathname}${url.search}`;
    const handler = this.routes.get(key) ?? this.routes.get(url.pathname);

    if (!handler) {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ message: "Not found" }));
      return;
    }

    const result = handler(req);
    res.writeHead(result.status ?? 200, { "content-type": "application/json" });
    res.end(JSON.stringify(result.body));
  }
}

test.describe("Admin role-based visibility", () => {
  let api: MockAdminApi;

  test.beforeEach(async () => {
    api = new MockAdminApi();
    api.json("/health", { ok: true });
    api.json("/me", {
      user: {
        id: "u-editor",
        email: "editor@example.com",
        phone: null,
        firstName: "Ed",
        lastName: "Itor",
        birthDate: null,
        displayName: "Editor",
        createdAt: "2025-01-01T00:00:00.000Z",
        role: "editor",
      },
    });
    api.json("/admin/content/pages/p-1", {
      id: "p-1",
      title: "About",
      slug: "about",
      seoTitle: null,
      seoDescription: null,
      seoImage: null,
      canonicalUrl: null,
      noIndex: false,
      published: false,
      workflowStatus: "draft",
      publishAt: null,
      unpublishAt: null,
      blocks: [
        {
          id: "b-1",
          type: "rich_text",
          order: 1,
          data: { body: "Hello" },
        },
      ],
    });
    await api.start();
  });

  test.afterEach(async () => {
    await api.stop();
  });

  test("editor nav hides ops/system tools", async ({ page }) => {
    await page.goto("/admin");

    await expect(page.getByRole("link", { name: "Pages" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Content" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Media" })).toBeVisible();

    await expect(page.getByRole("link", { name: "Developer tools" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "System" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Users" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Redirects" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Taxonomies" })).toHaveCount(0);
  });

  test("editor cannot access staging screen", async ({ page }) => {
    await page.goto("/admin/staging");
    await expect(page).toHaveURL(/\/access-denied$/);
  });

  test("editor page editing hides advanced workflow controls", async ({ page }) => {
    await page.goto("/admin/pages/p-1");

    await expect(page.getByText("Editing mode:")).toContainText("Simple mode");
    await expect(page.getByText("Advanced settings")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Publish" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Duplicate page" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Save content" })).toBeVisible();
  });
});
