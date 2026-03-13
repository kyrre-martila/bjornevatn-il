import { expect, test } from "@playwright/test";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";

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

/**
 * Public routing contract matrix: canonical pages, public content-type archives,
 * content-item details, slug-collision precedence, legacy redirects, and safety guards.
 */
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

  test("renders canonical public pages", async ({ page }) => {
    api.json("/public/content/pages/slug/about", pagePayload("about", "About"));
    api.json(
      "/public/content/pages/slug/contact",
      pagePayload("contact", "Contact"),
    );

    await page.goto("/about");
    await expect(page.getByText("About body copy")).toBeVisible();

    await page.goto("/contact");
    await expect(page.getByText("Contact body copy")).toBeVisible();
  });

  test.describe("content type archives", () => {
    const archiveCases = [
      {
        slug: "news",
        name: "News",
        templateKey: "news",
        assertItemTitle: false,
        item: {
          id: "n-1",
          slug: "my-article",
          title: "My Article",
          summary: "Summary",
          body: "My article detail body",
        },
      },
      {
        slug: "services",
        name: "Services",
        templateKey: "service",
        assertItemTitle: true,
        item: {
          id: "s-1",
          slug: "web-design",
          title: "Web Design",
          summary: "Design and delivery",
          body: "Design details",
        },
      },
      {
        slug: "products",
        name: "Products",
        templateKey: "landing",
        assertItemTitle: true,
        item: {
          id: "p-1",
          slug: "starter-kit",
          title: "Starter Kit",
          summary: "Product summary",
          body: "Starter Kit details",
        },
      },
    ] as const;

    for (const archiveCase of archiveCases) {
      test(`renders /${archiveCase.slug} archive`, async ({ page }) => {
        api.json(`/public/content/pages/slug/${archiveCase.slug}`, null, 404);
        api.json(`/public/content/types/${archiveCase.slug}`, {
          slug: archiveCase.slug,
          name: archiveCase.name,
          templateKey: archiveCase.templateKey,
          isPublic: true,
        });
        api.json(
          `/public/content/items/type-slug/${archiveCase.slug}?offset=0&limit=21`,
          [
            {
              id: archiveCase.item.id,
              slug: archiveCase.item.slug,
              title: archiveCase.item.title,
              summary: archiveCase.item.summary,
              body: archiveCase.item.body,
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
          ],
        );

        await page.goto(`/${archiveCase.slug}`);
        await expect(page).toHaveURL(new RegExp(`/${archiveCase.slug}$`));
        if (archiveCase.assertItemTitle) {
          await expect(
            page.getByText(archiveCase.item.title).first(),
          ).toBeVisible();
        }
      });
    }
  });

  test("renders /news/my-article detail", async ({ page }) => {
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

    await page.goto("/news/my-article");
    await expect(
      page.getByRole("heading", { level: 1, name: "My Article" }),
    ).toBeVisible();
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
    await expect(
      page.getByRole("heading", { level: 1, name: "Web Design" }),
    ).toBeVisible();
    await expect(page.getByText("Design details")).toBeVisible();
  });

  test("page slug collision takes precedence over content-type archive", async ({
    page,
  }) => {
    api.json(
      "/public/content/pages/slug/news",
      pagePayload("news", "News Landing"),
    );
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

  test("legacy /page/{slug} route permanently redirects to canonical route", async ({
    page,
  }) => {
    api.json("/public/content/pages/slug/about", pagePayload("about", "About"));

    const response = await page.request.get("/page/about", { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    expect(response.headers()["location"]).toBe("/about");
  });

  test("invalid redirect target is ignored and route resolves as not found", async ({
    page,
  }) => {
    api.json("/public/content/pages/slug/unsafe", {
      redirectTo: "https://example.com/phish",
    });

    const response = await page.goto("/unsafe");
    expect(response?.status()).toBe(404);
    await expect(page).toHaveURL(/\/unsafe$/);
  });

  test("private content types do not resolve to public archive routes", async ({
    page,
  }) => {
    api.json("/public/content/pages/slug/internal-tools", null, 404);
    api.json("/public/content/types/internal-tools", {
      slug: "internal-tools",
      name: "Internal Tools",
      templateKey: "index",
      isPublic: false,
    });

    const response = await page.goto("/internal-tools");
    expect(response?.status()).toBe(404);
    await expect(page).toHaveURL(/\/internal-tools$/);
  });
});
