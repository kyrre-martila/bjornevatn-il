import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const ADMIN_PASSWORD_HASH = "$2b$12$DAAmrURkwlpnQ94MLNG8kOrsiLaSYxaRlAGKPID8KlHPlFmRYN8QO";
const DEMO_PASSWORD_HASH = "$2b$12$SVmm.PHYJYFMvMsko3vL8.N5nib/5V/RCxWbat03EcX8rRR5S4qla";

const PAGE_SEEDS = [
  { id: "seed-page-home", slug: "home", title: "Home" },
  { id: "seed-page-about", slug: "about", title: "About" },
  { id: "seed-page-services", slug: "services", title: "Services" },
  { id: "seed-page-contact", slug: "contact", title: "Contact" },
] as const;

const NAVIGATION_SEEDS = [
  { id: "seed-nav-home", label: "Home", url: "/", order: 1 },
  { id: "seed-nav-about", label: "About", url: "/about", order: 2 },
  { id: "seed-nav-services", label: "Services", url: "/services", order: 3 },
  { id: "seed-nav-contact", label: "Contact", url: "/contact", order: 4 },
  { id: "seed-nav-news", label: "News", url: "/news", order: 5 },
] as const;

const NEWS_ITEMS = [
  {
    id: "seed-news-item-1",
    slug: "launching-our-demo-newsroom",
    title: "Launching Our Demo Newsroom",
    data: {
      excerpt:
        "Moren ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante venenatis dapibus.",
      body: "Moren ipsum dolor sit amet, consectetur adipiscing elit. Praesent commodo cursus magna, vel scelerisque nisl consectetur et. Moren ipsum faucibus dolor auctor, dapibus tellus ac cursus commodo.",
      image: "https://picsum.photos/seed/news-1/1200/800",
    },
  },
  {
    id: "seed-news-item-2",
    slug: "new-service-highlights",
    title: "New Service Highlights",
    data: {
      excerpt:
        "Moren ipsum dolor sit amet, consectetur adipiscing elit. Donec ullamcorper nulla non metus auctor fringilla.",
      body: "Moren ipsum dolor sit amet, consectetur adipiscing elit. Maecenas sed diam eget risus varius blandit sit amet non magna. Moren ipsum lacinia bibendum nulla sed consectetur.",
      image: "https://picsum.photos/seed/news-2/1200/800",
    },
  },
  {
    id: "seed-news-item-3",
    slug: "community-spotlight",
    title: "Community Spotlight",
    data: {
      excerpt:
        "Moren ipsum dolor sit amet, consectetur adipiscing elit. Cras mattis consectetur purus sit amet fermentum.",
      body: "Moren ipsum dolor sit amet, consectetur adipiscing elit. Aenean eu leo quam. Pellentesque ornare sem lacinia quam venenatis vestibulum. Moren ipsum donec id elit non mi porta gravida at eget metus.",
      image: "https://picsum.photos/seed/news-3/1200/800",
    },
  },
  {
    id: "seed-news-item-4",
    slug: "behind-the-scenes-update",
    title: "Behind the Scenes Update",
    data: {
      excerpt:
        "Moren ipsum dolor sit amet, consectetur adipiscing elit. Sed posuere consectetur est at lobortis.",
      body: "Moren ipsum dolor sit amet, consectetur adipiscing elit. Curabitur blandit tempus porttitor. Moren ipsum vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor.",
      image: "https://picsum.photos/seed/news-4/1200/800",
    },
  },
] as const;

async function seedUsers() {
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "System Administrator",
      firstName: "Admin",
      lastName: "User",
      passwordHash: ADMIN_PASSWORD_HASH,
      acceptedTerms: true,
      displayName: "System Administrator",
    },
  });

  await prisma.user.upsert({
    where: { email: "demo.user@example.com" },
    update: {},
    create: {
      email: "demo.user@example.com",
      name: "Demo User",
      firstName: "Demo",
      lastName: "User",
      passwordHash: DEMO_PASSWORD_HASH,
      acceptedTerms: true,
      displayName: "Demo User",
    },
  });

  await prisma.session.upsert({
    where: { token: "demo-session-token" },
    update: {
      userId: adminUser.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
    create: {
      userId: adminUser.id,
      token: "demo-session-token",
      ip: "127.0.0.1",
      userAgent: "seed-script",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      createdBy: "seed-script",
      updatedBy: "seed-script",
    },
  });

  await prisma.magicLink.upsert({
    where: { token: "demo-magic-link-token" },
    update: {
      email: "demo.user@example.com",
      expiresAt: new Date(Date.now() + 1000 * 60 * 10),
    },
    create: {
      email: "demo.user@example.com",
      token: "demo-magic-link-token",
      expiresAt: new Date(Date.now() + 1000 * 60 * 10),
      createdBy: "seed-script",
      updatedBy: "seed-script",
    },
  });
}

async function seedPages() {
  await Promise.all(
    PAGE_SEEDS.map((page) =>
      prisma.page.upsert({
        where: { slug: page.slug },
        update: { title: page.title, published: true },
        create: { id: page.id, slug: page.slug, title: page.title, published: true },
      }),
    ),
  );
}

async function seedNavigation() {
  await Promise.all(
    NAVIGATION_SEEDS.map((item) =>
      prisma.navigationItem.upsert({
        where: { id: item.id },
        update: { label: item.label, url: item.url, order: item.order, parentId: null },
        create: { ...item, parentId: null },
      }),
    ),
  );
}

async function seedNews() {
  const newsType = await prisma.contentType.upsert({
    where: { slug: "news" },
    update: {
      name: "News",
      description: "Demo news entries for local development.",
    },
    create: {
      id: "seed-content-type-news",
      name: "News",
      slug: "news",
      description: "Demo news entries for local development.",
    },
  });

  await Promise.all(
    NEWS_ITEMS.map((item) =>
      prisma.contentItem.upsert({
        where: { contentTypeId_slug: { contentTypeId: newsType.id, slug: item.slug } },
        update: { title: item.title, data: item.data, published: true },
        create: {
          id: item.id,
          contentTypeId: newsType.id,
          slug: item.slug,
          title: item.title,
          data: item.data,
          published: true,
        },
      }),
    ),
  );
}

async function main() {
  if (process.env.NODE_ENV !== "development") {
    console.log("Seeding is only allowed in development mode.");
    await prisma.$disconnect();
    process.exit(0);
  }

  await seedUsers();
  await seedPages();
  await seedNavigation();
  await seedNews();

  console.log("Seed completed.");
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
