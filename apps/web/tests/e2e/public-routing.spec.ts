import { expect, test } from "@playwright/test";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

const API_PORT = 4000;
const API_PREFIX = "/api/v1";

type JsonHandler = (req: IncomingMessage) => { status?: number; body: unknown };

class MockContentApi {
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

function pagePayload(slug: string, title: string, templateKey = "index") {
  return {
    slug,
    title,
    templateKey,
    seoTitle: null,
    seoDescription: null,
    seoImage: null,
    canonicalUrl: null,
    noIndex: false,
    blocks: [
      {
        id: `${slug}-block-1`,
        type: "rich_text",
        order: 1,
        data: { paragraphs: [`${title} body copy`] },
      },
    ],
  };
}

test.describe("Public routing contract", () => {
  let api: MockContentApi;

  test.beforeEach(async () => {
    api = new MockContentApi();
    api.json("/health", { ok: true });
    api.json("/public/content/settings", []);
    await api.start();
  });

  test.afterEach(async () => {
    await api.stop();
  });

  test("renders key top-level page routes", async ({ page }) => {
    api.json("/public/content/pages/slug/about", pagePayload("about", "About"));
    api.json("/public/content/pages/slug/contact", pagePayload("contact", "Contact"));
    api.json("/public/content/pages/slug/services", pagePayload("services", "Services"));
    api.json("/public/content/pages/slug/products", pagePayload("products", "Products"));

    await page.goto("/about");
    await expect(page.getByText("About body copy")).toBeVisible();

    await page.goto("/contact");
    await expect(page.getByText("Contact body copy")).toBeVisible();

    await page.goto("/services");
    await expect(page.getByText("Services body copy")).toBeVisible();

    await page.goto("/products");
    await expect(page.getByText("Products body copy")).toBeVisible();
  });

  test("renders /news archive and /news/my-article detail", async ({ page }) => {
    api.json("/public/content/pages/slug/news", null, 404);
    api.json("/public/content/types/news", {
      slug: "news",
      name: "News",
      templateKey: "news",
      isPublic: true,
    });
    api.json("/public/content/items/type-slug/news?offset=0&limit=21", [
      {
        id: "n-1",
        slug: "my-article",
        title: "My Article",
        summary: "Summary",
        body: "Body",
        shortDescription: "",
        featuredImage: null,
        callToActionLabel: "",
        callToActionUrl: "",
        relatedItemIds: [],
        publishedAt: "2025-01-10T00:00:00.000Z",
        canonicalUrl: null,
        noIndex: false,
        updatedAt: "2025-01-10T00:00:00.000Z",
      },
    ]);
    api.json("/public/content/items/type-slug/news/my-article", {
      id: "n-1",
      slug: "my-article",
      title: "My Article",
      summary: "Summary",
      body: "My article detail body",
      shortDescription: "",
      featuredImage: null,
      callToActionLabel: "",
      callToActionUrl: "",
      relatedItemIds: [],
      publishedAt: "2025-01-10T00:00:00.000Z",
      canonicalUrl: null,
      noIndex: false,
      updatedAt: "2025-01-10T00:00:00.000Z",
    });

    await page.goto("/news");
    await expect(page).toHaveURL(/\/news$/);

    await page.goto("/news/my-article");
    await expect(page.getByRole("heading", { level: 1, name: "My Article" })).toBeVisible();
    await expect(page.getByText("My article detail body")).toBeVisible();
  });

  test("renders /services/web-design detail", async ({ page }) => {
    api.json("/public/content/types/services", {
      slug: "services",
      name: "Services",
      templateKey: "service",
      isPublic: true,
    });
    api.json("/public/content/items/type-slug/services/web-design", {
      id: "s-1",
      slug: "web-design",
      title: "Web Design",
      summary: "Summary",
      body: "Design details",
      shortDescription: "Expert website design",
      featuredImage: null,
      callToActionLabel: "Start project",
      callToActionUrl: "/contact",
      relatedItemIds: [],
      publishedAt: "2025-01-10T00:00:00.000Z",
      canonicalUrl: null,
      noIndex: false,
      updatedAt: "2025-01-10T00:00:00.000Z",
    });

    await page.goto("/services/web-design");
    await expect(page.getByRole("heading", { level: 1, name: "Web Design" })).toBeVisible();
    await expect(page.getByText("Design details")).toBeVisible();
  });

  test("page slug collision takes precedence over content-type archive", async ({ page }) => {
    api.json("/public/content/pages/slug/news", pagePayload("news", "News Landing"));
    api.json("/public/content/types/news", {
      slug: "news",
      name: "News",
      templateKey: "news",
      isPublic: true,
    });
    api.json("/public/content/items/type-slug/news?offset=0&limit=21", []);

    await page.goto("/news");
    await expect(page.getByText("News Landing body copy")).toBeVisible();
    await expect(page.getByText("Read more")).toHaveCount(0);
  });

  test("legacy /page/{slug} route permanently redirects to canonical route", async ({ page }) => {
    api.json("/public/content/pages/slug/about", pagePayload("about", "About"));

    const response = await page.request.get("/page/about", { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    expect(response.headers()["location"]).toBe("/about");
  });

  test("invalid redirect target is ignored and route resolves as not found", async ({ page }) => {
    api.json("/public/content/pages/slug/unsafe", { redirectTo: "https://example.com/phish" });

    const response = await page.goto("/unsafe");
    expect(response?.status()).toBe(404);
    await expect(page).toHaveURL(/\/unsafe$/);
  });
});
