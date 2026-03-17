import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const ADMIN_PASSWORD_HASH =
  "$2b$12$DAAmrURkwlpnQ94MLNG8kOrsiLaSYxaRlAGKPID8KlHPlFmRYN8QO";
const DEMO_PASSWORD_HASH =
  "$2b$12$SVmm.PHYJYFMvMsko3vL8.N5nib/5V/RCxWbat03EcX8rRR5S4qla";

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
    slug: "sesongstart-pa-bjornevatn-stadion",
    title: "Sesongstart på Bjørnevatn stadion",
    data: {
      excerpt:
        "Vi markerer seriestart med aktiviteter for barn og ungdom før kampstart.",
      content:
        "Bjørnevatn IL inviterer hele lokalmiljøet til sesongåpning på hjemmebane med kiosksalg, frivilligpresentasjon og åpen aktivitetssone.",
      image: "https://picsum.photos/seed/news-season-start/1200/800",
      category: "club-news",
      publishedAt: "2026-04-10T12:00:00.000Z",
      authorName: "Bjørnevatn IL",
      isFeatured: true,
    },
  },
  {
    id: "seed-news-item-2",
    slug: "sterk-borteseier-i-treningskamp",
    title: "Sterk borteseier i treningskamp",
    data: {
      excerpt:
        "A-laget leverte en solid kamp og tok med seg en fortjent seier.",
      content:
        "Etter en jevn første omgang tok Bjørnevatn IL kontroll etter pause og avgjorde kampen med to raske mål i sluttminuttene.",
      image: "https://picsum.photos/seed/news-match-report/1200/800",
      category: "match-report",
      publishedAt: "2026-03-30T18:30:00.000Z",
      authorName: "Sportslig utvalg",
      isFeatured: false,
    },
  },
] as const;

const MATCH_ITEMS = [
  {
    id: "seed-match-home-upcoming",
    slug: "bil-vs-kirkenes-if-2026-05-12",
    title: "Bjørnevatn IL vs Kirkenes IF",
    data: {
      externalId: "match-import-2026-05-12-bil-kif",
      homeTeam: "Bjørnevatn IL",
      awayTeam: "Kirkenes IF",
      matchDate: "2026-05-12T18:00:00.000Z",
      league: "4. divisjon Finnmark",
      venue: "Bjørnevatn stadion",
      isHomeMatch: true,
      isFeatured: true,
      ticketSalesEnabled: false,
    },
  },
  {
    id: "seed-match-away-upcoming",
    slug: "hammerfest-sk-vs-bil-2026-05-20",
    title: "Hammerfest SK vs Bjørnevatn IL",
    data: {
      externalId: "match-import-2026-05-20-hsk-bil",
      homeTeam: "Hammerfest SK",
      awayTeam: "Bjørnevatn IL",
      matchDate: "2026-05-20T16:00:00.000Z",
      league: "4. divisjon Finnmark",
      venue: "Hammerfest kunstgress",
      isHomeMatch: false,
      isFeatured: false,
      ticketSalesEnabled: false,
    },
  },
] as const;

const HOMEPAGE_SETTINGS_ITEM = {
  id: "seed-homepage-settings",
  slug: "homepage-settings",
  title: "Homepage Settings",
  data: {
    heroTitle: "Velkommen til Bjørnevatn IL",
    heroText: "Fotballglede, fellesskap og aktivitet for hele lokalmiljøet.",
    heroImage: "https://picsum.photos/seed/homepage-hero/1600/900",
    showNextMatchHero: true,
    showWeatherSection: true,
    showNewsSection: true,
    showGrasrotSection: true,
    showFundingSection: true,
    showSponsorsSection: true,
    newsSectionTitle: "Siste nytt",
    sponsorsSectionTitle: "Våre samarbeidspartnere",
    fundingSectionTitle: "Støtte og tilskudd",
    grasrotSectionTitle: "Støtt oss med Grasrotandelen",
    grasrotInstructionsTitle: "Slik velger du Bjørnevatn IL",
    grasrotInstructionsText:
      "Send SMS med Bjornevatn IL til 60000 eller velg oss hos Norsk Tipping.",
    grasrotButtonLabel: "Velg Bjørnevatn IL",
    grasrotButtonUrl: "https://www.norsk-tipping.no/grasrotandelen",
  },
} as const;

const FUNDING_GRANTS = [
  {
    id: "seed-funding-grant-1",
    slug: "tippemidler-2025-garderobeoppgradering",
    title: "Tippemidler til garderobeoppgradering",
    data: {
      title: "Tippemidler til garderobeoppgradering",
      year: "2025",
      amount: "350000",
      description:
        "Tilskudd brukt til oppgradering av garderober og universell tilrettelegging.",
      image: "https://picsum.photos/seed/funding-grant-1/1200/800",
      category: "tippemidler",
      isFeaturedOnHomepage: true,
      sortOrder: "1",
    },
  },
] as const;

const SERVICE_ITEMS = [
  {
    id: "seed-service-accounting",
    slug: "accounting",
    title: "Accounting",
    shortDescription: "Core bookkeeping and close support for growing teams.",
    body: "Accounting service body copy for this blueprint example.",
    featuredImage: "https://picsum.photos/seed/service-accounting/1200/800",
    callToActionLabel: "Book accounting consultation",
    callToActionUrl: "/contact",
    sortOrder: 1,
    parentId: null,
  },
  {
    id: "seed-service-payroll",
    slug: "payroll",
    title: "Payroll",
    shortDescription: "Reliable payroll processing and compliance workflows.",
    body: "Payroll service body copy for this blueprint example.",
    featuredImage: "https://picsum.photos/seed/service-payroll/1200/800",
    callToActionLabel: "Talk payroll setup",
    callToActionUrl: "/contact",
    sortOrder: 2,
    parentId: "seed-service-accounting",
  },
  {
    id: "seed-service-invoicing",
    slug: "invoicing",
    title: "Invoicing",
    shortDescription: "Invoice creation, collections, and cashflow reporting.",
    body: "Invoicing service body copy for this blueprint example.",
    featuredImage: "https://picsum.photos/seed/service-invoicing/1200/800",
    callToActionLabel: "Improve invoicing process",
    callToActionUrl: "/contact",
    sortOrder: 3,
    parentId: "seed-service-accounting",
  },
  {
    id: "seed-service-annual-reports",
    slug: "annual-reports",
    title: "Annual Reports",
    shortDescription: "Year-end financial statements and filing support.",
    body: "Annual reports service body copy for this blueprint example.",
    featuredImage: "https://picsum.photos/seed/service-annual-reports/1200/800",
    callToActionLabel: "Plan annual reporting",
    callToActionUrl: "/contact",
    sortOrder: 4,
    parentId: null,
  },
  {
    id: "seed-service-advisory",
    slug: "advisory",
    title: "Advisory",
    shortDescription:
      "Strategic planning, forecasting, and finance leadership.",
    body: "Advisory service body copy for this blueprint example.",
    featuredImage: "https://picsum.photos/seed/service-advisory/1200/800",
    callToActionLabel: "Start advisory engagement",
    callToActionUrl: "/contact",
    sortOrder: 5,
    parentId: null,
  },
] as const;

const TEAM_MAIN_CATEGORIES = ["aldersbestemt", "senior"] as const;
const TEAM_GENDERS = ["gutter", "jenter", "herrer", "kvinner"] as const;
const TEAM_LEVELS = ["rekrutt", "a-lag"] as const;
const TEAM_STATUSES = ["active", "inactive", "archived"] as const;
const PERSON_ROLE_CATEGORIES = [
  "styret",
  "trenere",
  "andre-roller",
  "utvalg",
] as const;
const SPONSOR_TYPES = [
  "generalsponsor",
  "hovedsponsor",
  "sponsor",
  "samarbeidspartner",
] as const;
const SPONSOR_STATUSES = ["active", "inactive"] as const;

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
      role: "super_admin",
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
      role: "editor",
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
        create: {
          id: page.id,
          slug: page.slug,
          title: page.title,
          published: true,
        },
      }),
    ),
  );
}

async function seedNavigation() {
  await Promise.all(
    NAVIGATION_SEEDS.map((item) =>
      prisma.navigationItem.upsert({
        where: { id: item.id },
        update: {
          label: item.label,
          url: item.url,
          order: item.order,
          parentId: null,
        },
        create: { ...item, parentId: null },
      }),
    ),
  );
}

async function seedNews() {
  const newsTypeFields = [
    { key: "title", type: "text", required: true },
    { key: "slug", type: "text", required: true },
    { key: "excerpt", type: "textarea", required: false },
    { key: "content", type: "rich_text", required: true },
    { key: "image", type: "image", required: false },
    {
      key: "category",
      type: "text",
      required: true,
      helpText:
        "Allowed: club-news, match-report, events, youth, announcements",
    },
    { key: "publishedAt", type: "date", required: true },
    { key: "authorName", type: "text", required: false },
    { key: "isFeatured", type: "boolean", required: false },
  ] as const;

  const newsType = await prisma.contentType.upsert({
    where: { slug: "news" },
    update: {
      name: "News",
      description: "Club news and match reports.",
      templateKey: "news",
      isPublic: true,
      fields: newsTypeFields,
    },
    create: {
      id: "seed-content-type-news",
      name: "News",
      slug: "news",
      description: "Club news and match reports.",
      templateKey: "news",
      isPublic: true,
      fields: newsTypeFields,
    },
  });

  await Promise.all(
    NEWS_ITEMS.map((item) =>
      prisma.contentItem.upsert({
        where: {
          contentTypeId_slug: { contentTypeId: newsType.id, slug: item.slug },
        },
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

async function seedMatches() {
  const matchTypeFields = [
    { key: "externalId", type: "text", required: false },
    { key: "homeTeam", type: "text", required: false },
    { key: "awayTeam", type: "text", required: false },
    { key: "matchDate", type: "date", required: true },
    { key: "league", type: "text", required: false },
    { key: "venue", type: "text", required: false },
    { key: "isHomeMatch", type: "boolean", required: false },
    { key: "isFeatured", type: "boolean", required: false },
    { key: "ticketSalesEnabled", type: "boolean", required: false },
  ] as const;

  const matchType = await prisma.contentType.upsert({
    where: { slug: "match" },
    update: {
      name: "Match",
      description:
        "Football matches, including imported identifiers and fixtures.",
      templateKey: "match",
      isPublic: true,
      fields: matchTypeFields,
    },
    create: {
      id: "seed-content-type-match",
      name: "Match",
      slug: "match",
      description:
        "Football matches, including imported identifiers and fixtures.",
      templateKey: "match",
      isPublic: true,
      fields: matchTypeFields,
    },
  });

  await Promise.all(
    MATCH_ITEMS.map((item, index) =>
      prisma.contentItem.upsert({
        where: {
          contentTypeId_slug: { contentTypeId: matchType.id, slug: item.slug },
        },
        update: {
          title: item.title,
          data: item.data,
          published: true,
          sortOrder: index + 1,
        },
        create: {
          id: item.id,
          contentTypeId: matchType.id,
          slug: item.slug,
          title: item.title,
          data: item.data,
          published: true,
          sortOrder: index + 1,
        },
      }),
    ),
  );
}

async function seedHomepageSettings() {
  const homepageSettingsFields = [
    { key: "heroTitle", type: "text", required: false },
    { key: "heroText", type: "textarea", required: false },
    { key: "heroImage", type: "image", required: false },
    { key: "showNextMatchHero", type: "boolean", required: false },
    { key: "showWeatherSection", type: "boolean", required: false },
    { key: "showNewsSection", type: "boolean", required: false },
    { key: "showGrasrotSection", type: "boolean", required: false },
    { key: "showFundingSection", type: "boolean", required: false },
    { key: "showSponsorsSection", type: "boolean", required: false },
    { key: "newsSectionTitle", type: "text", required: false },
    { key: "sponsorsSectionTitle", type: "text", required: false },
    { key: "fundingSectionTitle", type: "text", required: false },
    { key: "grasrotSectionTitle", type: "text", required: false },
    { key: "grasrotInstructionsTitle", type: "text", required: false },
    { key: "grasrotInstructionsText", type: "textarea", required: false },
    { key: "grasrotButtonLabel", type: "text", required: false },
    { key: "grasrotButtonUrl", type: "text", required: false },
  ] as const;

  const homepageSettingsType = await prisma.contentType.upsert({
    where: { slug: "homepage-settings" },
    update: {
      name: "Homepage Settings",
      description:
        "Singleton-style homepage configuration and section toggles.",
      templateKey: "homepage-settings",
      isPublic: true,
      fields: homepageSettingsFields,
    },
    create: {
      id: "seed-content-type-homepage-settings",
      name: "Homepage Settings",
      slug: "homepage-settings",
      description:
        "Singleton-style homepage configuration and section toggles.",
      templateKey: "homepage-settings",
      isPublic: true,
      fields: homepageSettingsFields,
    },
  });

  await prisma.contentItem.upsert({
    where: {
      contentTypeId_slug: {
        contentTypeId: homepageSettingsType.id,
        slug: HOMEPAGE_SETTINGS_ITEM.slug,
      },
    },
    update: {
      title: HOMEPAGE_SETTINGS_ITEM.title,
      data: HOMEPAGE_SETTINGS_ITEM.data,
      published: true,
      sortOrder: 1,
    },
    create: {
      id: HOMEPAGE_SETTINGS_ITEM.id,
      contentTypeId: homepageSettingsType.id,
      slug: HOMEPAGE_SETTINGS_ITEM.slug,
      title: HOMEPAGE_SETTINGS_ITEM.title,
      data: HOMEPAGE_SETTINGS_ITEM.data,
      published: true,
      sortOrder: 1,
    },
  });
}

async function seedFundingGrants() {
  const fundingGrantFields = [
    { key: "title", type: "text", required: true },
    { key: "year", type: "text", required: true },
    { key: "amount", type: "text", required: true },
    { key: "description", type: "textarea", required: false },
    { key: "image", type: "image", required: false },
    {
      key: "category",
      type: "text",
      required: true,
      helpText:
        "Allowed: tippemidler, other-support, facility-upgrade, community-support",
    },
    { key: "isFeaturedOnHomepage", type: "boolean", required: false },
    { key: "sortOrder", type: "text", required: false },
  ] as const;

  const fundingGrantType = await prisma.contentType.upsert({
    where: { slug: "funding-grant" },
    update: {
      name: "Funding Grant",
      description: "Funding and support entries for homepage presentation.",
      templateKey: "funding-grant",
      isPublic: true,
      fields: fundingGrantFields,
    },
    create: {
      id: "seed-content-type-funding-grant",
      name: "Funding Grant",
      slug: "funding-grant",
      description: "Funding and support entries for homepage presentation.",
      templateKey: "funding-grant",
      isPublic: true,
      fields: fundingGrantFields,
    },
  });

  await Promise.all(
    FUNDING_GRANTS.map((grant, index) =>
      prisma.contentItem.upsert({
        where: {
          contentTypeId_slug: {
            contentTypeId: fundingGrantType.id,
            slug: grant.slug,
          },
        },
        update: {
          title: grant.title,
          data: grant.data,
          published: true,
          sortOrder: index + 1,
        },
        create: {
          id: grant.id,
          contentTypeId: fundingGrantType.id,
          slug: grant.slug,
          title: grant.title,
          data: grant.data,
          published: true,
          sortOrder: index + 1,
        },
      }),
    ),
  );
}

async function seedServices() {
  const servicesType = await prisma.contentType.upsert({
    where: { slug: "services" },
    update: {
      name: "Services",
      description:
        "Reference ContentType showing hierarchy, taxonomy, and relationship fields.",
      templateKey: "service",
      isPublic: true,
      fields: [
        {
          key: "shortDescription",
          label: "Short description",
          type: "textarea",
          required: true,
        },
        {
          key: "body",
          label: "Body",
          type: "rich_text",
          required: true,
        },
        {
          key: "featuredImage",
          label: "Featured image",
          type: "media",
          required: false,
        },
        {
          key: "relatedServices",
          label: "Related services",
          type: "relation",
          required: false,
          relation: {
            targetType: "contentType",
            targetSlug: "services",
          },
        },
        {
          key: "callToActionLabel",
          label: "CTA label",
          type: "text",
          required: false,
        },
        {
          key: "callToActionUrl",
          label: "CTA URL",
          type: "text",
          required: false,
        },
      ],
    },
    create: {
      id: "seed-content-type-services",
      name: "Services",
      slug: "services",
      description:
        "Reference ContentType showing hierarchy, taxonomy, and relationship fields.",
      templateKey: "service",
      isPublic: true,
      fields: [
        {
          key: "shortDescription",
          label: "Short description",
          type: "textarea",
          required: true,
        },
        {
          key: "body",
          label: "Body",
          type: "rich_text",
          required: true,
        },
        {
          key: "featuredImage",
          label: "Featured image",
          type: "media",
          required: false,
        },
        {
          key: "relatedServices",
          label: "Related services",
          type: "relation",
          required: false,
          relation: {
            targetType: "contentType",
            targetSlug: "services",
          },
        },
        {
          key: "callToActionLabel",
          label: "CTA label",
          type: "text",
          required: false,
        },
        {
          key: "callToActionUrl",
          label: "CTA URL",
          type: "text",
          required: false,
        },
      ],
    },
  });

  const itemsById = new Map<string, { id: string }>();

  for (const item of SERVICE_ITEMS) {
    const upserted = await prisma.contentItem.upsert({
      where: {
        contentTypeId_slug: {
          contentTypeId: servicesType.id,
          slug: item.slug,
        },
      },
      update: {
        title: item.title,
        sortOrder: item.sortOrder,
        parentId: item.parentId,
        published: true,
        data: {
          shortDescription: item.shortDescription,
          body: item.body,
          featuredImage: item.featuredImage,
          relatedServices: [],
          callToActionLabel: item.callToActionLabel,
          callToActionUrl: item.callToActionUrl,
        },
      },
      create: {
        id: item.id,
        contentTypeId: servicesType.id,
        slug: item.slug,
        title: item.title,
        sortOrder: item.sortOrder,
        parentId: item.parentId,
        published: true,
        data: {
          shortDescription: item.shortDescription,
          body: item.body,
          featuredImage: item.featuredImage,
          relatedServices: [],
          callToActionLabel: item.callToActionLabel,
          callToActionUrl: item.callToActionUrl,
        },
      },
    });

    itemsById.set(item.id, { id: upserted.id });
  }

  const accounting = itemsById.get("seed-service-accounting");
  const payroll = itemsById.get("seed-service-payroll");
  const annualReports = itemsById.get("seed-service-annual-reports");
  const advisory = itemsById.get("seed-service-advisory");

  if (accounting && payroll && annualReports && advisory) {
    await prisma.contentItem.update({
      where: { id: accounting.id },
      data: {
        data: {
          shortDescription:
            "Core bookkeeping and close support for growing teams.",
          body: "Accounting service body copy for this blueprint example.",
          featuredImage:
            "https://picsum.photos/seed/service-accounting/1200/800",
          relatedServices: [payroll.id, annualReports.id],
          callToActionLabel: "Book accounting consultation",
          callToActionUrl: "/contact",
        },
      },
    });

    await prisma.contentItem.update({
      where: { id: advisory.id },
      data: {
        data: {
          shortDescription:
            "Strategic planning, forecasting, and finance leadership.",
          body: "Advisory service body copy for this blueprint example.",
          featuredImage: "https://picsum.photos/seed/service-advisory/1200/800",
          relatedServices: [annualReports.id],
          callToActionLabel: "Start advisory engagement",
          callToActionUrl: "/contact",
        },
      },
    });
  }

  const serviceCategory = await prisma.taxonomy.upsert({
    where: { slug: "service-category" },
    update: {
      name: "Service Category",
      description: "Reference taxonomy for the Services ContentType.",
    },
    create: {
      id: "seed-taxonomy-service-category",
      name: "Service Category",
      slug: "service-category",
      description: "Reference taxonomy for the Services ContentType.",
    },
  });

  const financeTerm = await prisma.term.upsert({
    where: {
      taxonomyId_slug: {
        taxonomyId: serviceCategory.id,
        slug: "finance",
      },
    },
    update: { name: "Finance", description: "Financial workflow services." },
    create: {
      id: "seed-term-finance",
      taxonomyId: serviceCategory.id,
      name: "Finance",
      slug: "finance",
      description: "Financial workflow services.",
    },
  });

  const operationsTerm = await prisma.term.upsert({
    where: {
      taxonomyId_slug: {
        taxonomyId: serviceCategory.id,
        slug: "operations",
      },
    },
    update: { name: "Operations", description: "Operational services." },
    create: {
      id: "seed-term-operations",
      taxonomyId: serviceCategory.id,
      name: "Operations",
      slug: "operations",
      description: "Operational services.",
    },
  });

  const advisoryTerm = await prisma.term.upsert({
    where: {
      taxonomyId_slug: {
        taxonomyId: serviceCategory.id,
        slug: "advisory",
      },
    },
    update: { name: "Advisory", description: "Strategic advisory services." },
    create: {
      id: "seed-term-advisory",
      taxonomyId: serviceCategory.id,
      name: "Advisory",
      slug: "advisory",
      description: "Strategic advisory services.",
    },
  });

  const termAssignments: Record<string, string[]> = {
    "seed-service-accounting": [financeTerm.id],
    "seed-service-payroll": [operationsTerm.id],
    "seed-service-invoicing": [operationsTerm.id],
    "seed-service-annual-reports": [financeTerm.id],
    "seed-service-advisory": [advisoryTerm.id],
  };

  for (const [seedId, termIds] of Object.entries(termAssignments)) {
    const contentItem = itemsById.get(seedId);
    if (!contentItem) {
      continue;
    }

    await prisma.contentItemTerm.deleteMany({
      where: { contentItemId: contentItem.id },
    });
    await prisma.contentItemTerm.createMany({
      data: termIds.map((termId) => ({
        contentItemId: contentItem.id,
        termId,
      })),
      skipDuplicates: true,
    });
  }
}

async function seedClubWebsiteModels() {
  const clubType = await prisma.contentType.upsert({
    where: { slug: "club" },
    update: {
      name: "Club",
      description: "Global club settings and key contact/location details.",
      templateKey: "club",
      isPublic: true,
      fields: [
        { key: "name", label: "Name", type: "text", required: true },
        {
          key: "shortName",
          label: "Short name",
          type: "text",
          required: true,
        },
        {
          key: "organizationNumber",
          label: "Organization number",
          type: "text",
          required: true,
        },
        { key: "email", label: "Email", type: "text", required: true },
        { key: "phone", label: "Phone", type: "text", required: false },
        {
          key: "addressLine",
          label: "Address line",
          type: "text",
          required: false,
        },
        {
          key: "postalCode",
          label: "Postal code",
          type: "text",
          required: false,
        },
        { key: "city", label: "City", type: "text", required: false },
        {
          key: "country",
          label: "Country",
          type: "text",
          required: false,
        },
        {
          key: "mapUrl",
          label: "Map URL",
          type: "text",
          required: false,
        },
        {
          key: "homeFieldName",
          label: "Home field name",
          type: "text",
          required: false,
        },
        {
          key: "homeFieldAddress",
          label: "Home field address",
          type: "text",
          required: false,
        },
        {
          key: "homeFieldMapUrl",
          label: "Home field map URL",
          type: "text",
          required: false,
        },
        {
          key: "latitude",
          label: "Latitude",
          type: "text",
          required: false,
        },
        {
          key: "longitude",
          label: "Longitude",
          type: "text",
          required: false,
        },
        { key: "logo", label: "Logo", type: "image", required: false },
        {
          key: "heroImage",
          label: "Hero image",
          type: "image",
          required: false,
        },
        {
          key: "clubhouseName",
          label: "Clubhouse name",
          type: "text",
          required: false,
        },
        {
          key: "clubhouseDescription",
          label: "Clubhouse description",
          type: "textarea",
          required: false,
        },
        {
          key: "clubhouseAddress",
          label: "Clubhouse address",
          type: "text",
          required: false,
        },
        {
          key: "clubhouseRentalPrice",
          label: "Clubhouse rental price",
          type: "text",
          required: false,
        },
        {
          key: "clubhouseRentalRules",
          label: "Clubhouse rental rules",
          type: "textarea",
          required: false,
        },
        {
          key: "grasrotEnabled",
          label: "Grasrot enabled",
          type: "boolean",
          required: true,
        },
        {
          key: "grasrotOrganizationNumber",
          label: "Grasrot organization number",
          type: "text",
          required: false,
        },
        {
          key: "socialLinks",
          label: "Social links",
          type: "textarea",
          required: false,
          helpText:
            "JSON array of { platform, url, sortOrder } objects for the club profile.",
        },
      ],
    },
    create: {
      id: "seed-content-type-club",
      name: "Club",
      slug: "club",
      description: "Global club settings and key contact/location details.",
      templateKey: "club",
      isPublic: true,
      fields: [
        { key: "name", label: "Name", type: "text", required: true },
        {
          key: "shortName",
          label: "Short name",
          type: "text",
          required: true,
        },
        {
          key: "organizationNumber",
          label: "Organization number",
          type: "text",
          required: true,
        },
        { key: "email", label: "Email", type: "text", required: true },
        { key: "phone", label: "Phone", type: "text", required: false },
        {
          key: "addressLine",
          label: "Address line",
          type: "text",
          required: false,
        },
        {
          key: "postalCode",
          label: "Postal code",
          type: "text",
          required: false,
        },
        { key: "city", label: "City", type: "text", required: false },
        {
          key: "country",
          label: "Country",
          type: "text",
          required: false,
        },
        {
          key: "mapUrl",
          label: "Map URL",
          type: "text",
          required: false,
        },
        {
          key: "homeFieldName",
          label: "Home field name",
          type: "text",
          required: false,
        },
        {
          key: "homeFieldAddress",
          label: "Home field address",
          type: "text",
          required: false,
        },
        {
          key: "homeFieldMapUrl",
          label: "Home field map URL",
          type: "text",
          required: false,
        },
        {
          key: "latitude",
          label: "Latitude",
          type: "text",
          required: false,
        },
        {
          key: "longitude",
          label: "Longitude",
          type: "text",
          required: false,
        },
        { key: "logo", label: "Logo", type: "image", required: false },
        {
          key: "heroImage",
          label: "Hero image",
          type: "image",
          required: false,
        },
        {
          key: "clubhouseName",
          label: "Clubhouse name",
          type: "text",
          required: false,
        },
        {
          key: "clubhouseDescription",
          label: "Clubhouse description",
          type: "textarea",
          required: false,
        },
        {
          key: "clubhouseAddress",
          label: "Clubhouse address",
          type: "text",
          required: false,
        },
        {
          key: "clubhouseRentalPrice",
          label: "Clubhouse rental price",
          type: "text",
          required: false,
        },
        {
          key: "clubhouseRentalRules",
          label: "Clubhouse rental rules",
          type: "textarea",
          required: false,
        },
        {
          key: "grasrotEnabled",
          label: "Grasrot enabled",
          type: "boolean",
          required: true,
        },
        {
          key: "grasrotOrganizationNumber",
          label: "Grasrot organization number",
          type: "text",
          required: false,
        },
        {
          key: "socialLinks",
          label: "Social links",
          type: "textarea",
          required: false,
          helpText:
            "JSON array of { platform, url, sortOrder } objects for the club profile.",
        },
      ],
    },
  });

  await prisma.contentItem.upsert({
    where: {
      contentTypeId_slug: { contentTypeId: clubType.id, slug: "club" },
    },
    update: {
      title: "Bjørnevatn IL",
      published: true,
      data: {
        name: "Bjørnevatn IL",
        shortName: "BIL",
        organizationNumber: "971512233",
        email: "post@bjornevatn-il.no",
        phone: "+47 78 99 00 11",
        addressLine: "Bjørnevatnveien 12",
        postalCode: "9910",
        city: "Bjørnevatn",
        country: "Norge",
        mapUrl: "https://maps.google.com/?q=Bj%C3%B8rnevatn",
        homeFieldName: "Bjørnevatn Stadion",
        homeFieldAddress: "Stadionveien 4, 9910 Bjørnevatn",
        homeFieldMapUrl: "https://maps.google.com/?q=Bj%C3%B8rnevatn+Stadion",
        latitude: "69.6678",
        longitude: "29.9871",
        logo: "https://picsum.photos/seed/bjornevatn-logo/512/512",
        heroImage: "https://picsum.photos/seed/bjornevatn-hero/1600/900",
        clubhouseName: "Bjørnevatn klubbhus",
        clubhouseDescription:
          "Klubbhuset brukes til møter, arrangementer og utleie for lokale aktiviteter.",
        clubhouseAddress: "Klubbhusveien 2, 9910 Bjørnevatn",
        clubhouseRentalPrice: "2500 NOK per dag",
        clubhouseRentalRules:
          "Utleie krever skriftlig avtale. Leietaker er ansvarlig for rydding og nøkkellevering.",
        grasrotEnabled: true,
        grasrotOrganizationNumber: "971512233",
        socialLinks: JSON.stringify([
          {
            platform: "facebook",
            url: "https://www.facebook.com/bjornevatnil",
            sortOrder: 1,
          },
          {
            platform: "instagram",
            url: "https://www.instagram.com/bjornevatnil",
            sortOrder: 2,
          },
        ]),
      },
    },
    create: {
      id: "seed-club-item",
      contentTypeId: clubType.id,
      slug: "club",
      title: "Bjørnevatn IL",
      published: true,
      data: {
        name: "Bjørnevatn IL",
        shortName: "BIL",
        organizationNumber: "971512233",
        email: "post@bjornevatn-il.no",
        phone: "+47 78 99 00 11",
        addressLine: "Bjørnevatnveien 12",
        postalCode: "9910",
        city: "Bjørnevatn",
        country: "Norge",
        mapUrl: "https://maps.google.com/?q=Bj%C3%B8rnevatn",
        homeFieldName: "Bjørnevatn Stadion",
        homeFieldAddress: "Stadionveien 4, 9910 Bjørnevatn",
        homeFieldMapUrl: "https://maps.google.com/?q=Bj%C3%B8rnevatn+Stadion",
        latitude: "69.6678",
        longitude: "29.9871",
        logo: "https://picsum.photos/seed/bjornevatn-logo/512/512",
        heroImage: "https://picsum.photos/seed/bjornevatn-hero/1600/900",
        clubhouseName: "Bjørnevatn klubbhus",
        clubhouseDescription:
          "Klubbhuset brukes til møter, arrangementer og utleie for lokale aktiviteter.",
        clubhouseAddress: "Klubbhusveien 2, 9910 Bjørnevatn",
        clubhouseRentalPrice: "2500 NOK per dag",
        clubhouseRentalRules:
          "Utleie krever skriftlig avtale. Leietaker er ansvarlig for rydding og nøkkellevering.",
        grasrotEnabled: true,
        grasrotOrganizationNumber: "971512233",
        socialLinks: JSON.stringify([
          {
            platform: "facebook",
            url: "https://www.facebook.com/bjornevatnil",
            sortOrder: 1,
          },
          {
            platform: "instagram",
            url: "https://www.instagram.com/bjornevatnil",
            sortOrder: 2,
          },
        ]),
      },
    },
  });

  const teamType = await prisma.contentType.upsert({
    where: { slug: "team" },
    update: {
      name: "Team",
      description: "Football teams with coaching and training information.",
      templateKey: "team",
      isPublic: true,
      fields: [
        {
          key: "mainCategory",
          type: "text",
          required: true,
          helpText: `Allowed: ${TEAM_MAIN_CATEGORIES.join(", ")}`,
        },
        {
          key: "gender",
          type: "text",
          required: true,
          helpText: `Allowed: ${TEAM_GENDERS.join(", ")}`,
        },
        {
          key: "teamLevel",
          type: "text",
          required: false,
          helpText: `Allowed: ${TEAM_LEVELS.join(", ")} (or empty)`,
        },
        { key: "age", type: "text", required: false },
        { key: "description", type: "textarea", required: false },
        { key: "teamImage", type: "image", required: false },
        {
          key: "status",
          type: "text",
          required: true,
          helpText: `Allowed: ${TEAM_STATUSES.join(", ")}`,
        },
        { key: "sortOrder", type: "text", required: false },
        { key: "spondCode", type: "text", required: false },
        { key: "spondLink", type: "text", required: false },
        { key: "fotballNoUrl", type: "text", required: false },
        {
          key: "coaches",
          type: "textarea",
          required: false,
          helpText:
            "JSON array of { name, role, phone, email, image, sortOrder }.",
        },
        {
          key: "trainingSessions",
          type: "textarea",
          required: false,
          helpText:
            "JSON array of { dayOfWeek, startTime, endTime, location, notes, sortOrder }.",
        },
        {
          key: "socialLinks",
          type: "textarea",
          required: false,
          helpText: "JSON array of { platform, url, sortOrder }.",
        },
      ],
    },
    create: {
      id: "seed-content-type-team",
      name: "Team",
      slug: "team",
      description: "Football teams with coaching and training information.",
      templateKey: "team",
      isPublic: true,
      fields: [
        {
          key: "mainCategory",
          type: "text",
          required: true,
          helpText: `Allowed: ${TEAM_MAIN_CATEGORIES.join(", ")}`,
        },
        {
          key: "gender",
          type: "text",
          required: true,
          helpText: `Allowed: ${TEAM_GENDERS.join(", ")}`,
        },
        {
          key: "teamLevel",
          type: "text",
          required: false,
          helpText: `Allowed: ${TEAM_LEVELS.join(", ")} (or empty)`,
        },
        { key: "age", type: "text", required: false },
        { key: "description", type: "textarea", required: false },
        { key: "teamImage", type: "image", required: false },
        {
          key: "status",
          type: "text",
          required: true,
          helpText: `Allowed: ${TEAM_STATUSES.join(", ")}`,
        },
        { key: "sortOrder", type: "text", required: false },
        { key: "spondCode", type: "text", required: false },
        { key: "spondLink", type: "text", required: false },
        { key: "fotballNoUrl", type: "text", required: false },
        {
          key: "coaches",
          type: "textarea",
          required: false,
          helpText:
            "JSON array of { name, role, phone, email, image, sortOrder }.",
        },
        {
          key: "trainingSessions",
          type: "textarea",
          required: false,
          helpText:
            "JSON array of { dayOfWeek, startTime, endTime, location, notes, sortOrder }.",
        },
        {
          key: "socialLinks",
          type: "textarea",
          required: false,
          helpText: "JSON array of { platform, url, sortOrder }.",
        },
      ],
    },
  });

  const teamSeeds = [
    {
      id: "seed-team-g13",
      slug: "g13",
      title: "G13",
      data: {
        mainCategory: "aldersbestemt",
        gender: "gutter",
        teamLevel: "",
        age: "13",
        description: "G13-laget for spillere født i relevant årsklasse.",
        teamImage: "https://picsum.photos/seed/team-g13/1200/800",
        status: "active",
        sortOrder: "1",
        spondCode: "G13BIL",
        spondLink: "https://group.spond.com/G13BIL",
        fotballNoUrl: "https://www.fotball.no/lag/g13-bjornevatn-il",
        coaches: JSON.stringify([
          {
            name: "Ola Nordmann",
            role: "Hovedtrener",
            phone: "+47 900 00 001",
            email: "ola@example.com",
            image: "https://picsum.photos/seed/coach-ola/400/400",
            sortOrder: 1,
          },
        ]),
        trainingSessions: JSON.stringify([
          {
            dayOfWeek: "mandag",
            startTime: "17:00",
            endTime: "18:30",
            location: "Bjørnevatn Stadion",
            notes: "Utendørs trening",
            sortOrder: 1,
          },
        ]),
        socialLinks: JSON.stringify([]),
      },
    },
    {
      id: "seed-team-j15",
      slug: "j15",
      title: "J15",
      data: {
        mainCategory: "aldersbestemt",
        gender: "jenter",
        teamLevel: "",
        age: "15",
        description: "J15-laget med fokus på utvikling og trivsel.",
        teamImage: "https://picsum.photos/seed/team-j15/1200/800",
        status: "active",
        sortOrder: "2",
        spondCode: "J15BIL",
        spondLink: "https://group.spond.com/J15BIL",
        fotballNoUrl: "https://www.fotball.no/lag/j15-bjornevatn-il",
        coaches: JSON.stringify([
          {
            name: "Kari Hansen",
            role: "Trener",
            phone: "+47 900 00 002",
            email: "kari@example.com",
            image: "https://picsum.photos/seed/coach-kari/400/400",
            sortOrder: 1,
          },
        ]),
        trainingSessions: JSON.stringify([
          {
            dayOfWeek: "onsdag",
            startTime: "18:00",
            endTime: "19:30",
            location: "Bjørnevatn Stadion",
            notes: "Teknisk økt",
            sortOrder: 1,
          },
        ]),
        socialLinks: JSON.stringify([]),
      },
    },
    {
      id: "seed-team-a-lag-herrer",
      slug: "a-lag-herrer",
      title: "A-lag Herrer",
      data: {
        mainCategory: "senior",
        gender: "herrer",
        teamLevel: "a-lag",
        age: "Senior",
        description: "Seniorlag herrer som spiller i regional serie.",
        teamImage: "https://picsum.photos/seed/team-a-lag-herrer/1200/800",
        status: "active",
        sortOrder: "10",
        spondCode: "ALAGBIL",
        spondLink: "https://group.spond.com/ALAGBIL",
        fotballNoUrl: "https://www.fotball.no/lag/a-lag-herrer-bjornevatn-il",
        coaches: JSON.stringify([
          {
            name: "Per Olsen",
            role: "Hovedtrener",
            phone: "+47 900 00 003",
            email: "per@example.com",
            image: "https://picsum.photos/seed/coach-per/400/400",
            sortOrder: 1,
          },
        ]),
        trainingSessions: JSON.stringify([
          {
            dayOfWeek: "tirsdag",
            startTime: "19:00",
            endTime: "20:30",
            location: "Bjørnevatn Stadion",
            notes: "Kampforberedende økt",
            sortOrder: 1,
          },
        ]),
        socialLinks: JSON.stringify([
          {
            platform: "instagram",
            url: "https://www.instagram.com/bjornevatnil_herrer",
            sortOrder: 1,
          },
        ]),
      },
    },
  ] as const;

  for (const team of teamSeeds) {
    await prisma.contentItem.upsert({
      where: {
        contentTypeId_slug: { contentTypeId: teamType.id, slug: team.slug },
      },
      update: { title: team.title, data: team.data, published: true },
      create: {
        id: team.id,
        contentTypeId: teamType.id,
        slug: team.slug,
        title: team.title,
        data: team.data,
        published: true,
      },
    });
  }

  const personRoleType = await prisma.contentType.upsert({
    where: { slug: "person-role" },
    update: {
      name: "PersonRole",
      description: "Board and role listing entries.",
      templateKey: "person-role",
      isPublic: true,
      fields: [
        { key: "fullName", type: "text", required: true },
        { key: "roleTitle", type: "text", required: true },
        {
          key: "category",
          type: "text",
          required: true,
          helpText: `Allowed: ${PERSON_ROLE_CATEGORIES.join(", ")}`,
        },
        { key: "image", type: "image", required: false },
        { key: "email", type: "text", required: false },
        { key: "phone", type: "text", required: false },
        { key: "description", type: "textarea", required: false },
        { key: "termPeriod", type: "text", required: false },
        { key: "sortOrder", type: "text", required: false },
        { key: "isActive", type: "boolean", required: true },
      ],
    },
    create: {
      id: "seed-content-type-person-role",
      name: "PersonRole",
      slug: "person-role",
      description: "Board and role listing entries.",
      templateKey: "person-role",
      isPublic: true,
      fields: [
        { key: "fullName", type: "text", required: true },
        { key: "roleTitle", type: "text", required: true },
        {
          key: "category",
          type: "text",
          required: true,
          helpText: `Allowed: ${PERSON_ROLE_CATEGORIES.join(", ")}`,
        },
        { key: "image", type: "image", required: false },
        { key: "email", type: "text", required: false },
        { key: "phone", type: "text", required: false },
        { key: "description", type: "textarea", required: false },
        { key: "termPeriod", type: "text", required: false },
        { key: "sortOrder", type: "text", required: false },
        { key: "isActive", type: "boolean", required: true },
      ],
    },
  });

  const personRoleSeeds = [
    {
      id: "seed-person-role-chair",
      slug: "styreleder-anne-hansen",
      title: "Anne Hansen",
      data: {
        fullName: "Anne Hansen",
        roleTitle: "Styreleder",
        category: "styret",
        image: "https://picsum.photos/seed/person-anne/500/500",
        email: "anne@example.com",
        phone: "+47 900 10 001",
        description: "Leder styrets arbeid og klubbens strategiske retning.",
        termPeriod: "2024-2026",
        sortOrder: "1",
        isActive: true,
      },
    },
    {
      id: "seed-person-role-board-member",
      slug: "styremedlem-tom-jensen",
      title: "Tom Jensen",
      data: {
        fullName: "Tom Jensen",
        roleTitle: "Styremedlem",
        category: "styret",
        image: "https://picsum.photos/seed/person-tom/500/500",
        email: "tom@example.com",
        phone: "+47 900 10 002",
        description: "Ansvarlig for anlegg og frivillighetskoordinering.",
        termPeriod: "2024-2026",
        sortOrder: "2",
        isActive: true,
      },
    },
  ] as const;

  for (const role of personRoleSeeds) {
    await prisma.contentItem.upsert({
      where: {
        contentTypeId_slug: {
          contentTypeId: personRoleType.id,
          slug: role.slug,
        },
      },
      update: { title: role.title, data: role.data, published: true },
      create: {
        id: role.id,
        contentTypeId: personRoleType.id,
        slug: role.slug,
        title: role.title,
        data: role.data,
        published: true,
      },
    });
  }

  const sponsorType = await prisma.contentType.upsert({
    where: { slug: "sponsor" },
    update: {
      name: "Sponsor",
      description: "Sponsor and partner entries.",
      templateKey: "sponsor",
      isPublic: true,
      fields: [
        {
          key: "type",
          type: "text",
          required: true,
          helpText: `Allowed: ${SPONSOR_TYPES.join(", ")}`,
        },
        { key: "logo", type: "image", required: true },
        { key: "logoDark", type: "image", required: false },
        { key: "websiteUrl", type: "text", required: false },
        { key: "description", type: "textarea", required: false },
        { key: "sortOrder", type: "text", required: false },
        {
          key: "status",
          type: "text",
          required: true,
          helpText: `Allowed: ${SPONSOR_STATUSES.join(", ")}`,
        },
      ],
    },
    create: {
      id: "seed-content-type-sponsor",
      name: "Sponsor",
      slug: "sponsor",
      description: "Sponsor and partner entries.",
      templateKey: "sponsor",
      isPublic: true,
      fields: [
        {
          key: "type",
          type: "text",
          required: true,
          helpText: `Allowed: ${SPONSOR_TYPES.join(", ")}`,
        },
        { key: "logo", type: "image", required: true },
        { key: "logoDark", type: "image", required: false },
        { key: "websiteUrl", type: "text", required: false },
        { key: "description", type: "textarea", required: false },
        { key: "sortOrder", type: "text", required: false },
        {
          key: "status",
          type: "text",
          required: true,
          helpText: `Allowed: ${SPONSOR_STATUSES.join(", ")}`,
        },
      ],
    },
  });

  const sponsorSeeds = [
    {
      id: "seed-sponsor-general",
      slug: "kirkenes-elektro",
      title: "Kirkenes Elektro",
      data: {
        type: "generalsponsor",
        logo: "https://picsum.photos/seed/sponsor-general/600/300",
        logoDark: "https://picsum.photos/seed/sponsor-general-dark/600/300",
        websiteUrl: "https://example.com/kirkenes-elektro",
        description: "Generalsponsor for bredde og barnefotball.",
        sortOrder: "1",
        status: "active",
      },
    },
    {
      id: "seed-sponsor-local",
      slug: "nordic-maskin",
      title: "Nordic Maskin",
      data: {
        type: "sponsor",
        logo: "https://picsum.photos/seed/sponsor-local/600/300",
        logoDark: "https://picsum.photos/seed/sponsor-local-dark/600/300",
        websiteUrl: "https://example.com/nordic-maskin",
        description: "Lokal samarbeidspartner som støtter ungdomsavdelingen.",
        sortOrder: "2",
        status: "active",
      },
    },
  ] as const;

  for (const sponsor of sponsorSeeds) {
    await prisma.contentItem.upsert({
      where: {
        contentTypeId_slug: {
          contentTypeId: sponsorType.id,
          slug: sponsor.slug,
        },
      },
      update: { title: sponsor.title, data: sponsor.data, published: true },
      create: {
        id: sponsor.id,
        contentTypeId: sponsorType.id,
        slug: sponsor.slug,
        title: sponsor.title,
        data: sponsor.data,
        published: true,
      },
    });
  }
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
  await seedMatches();
  await seedHomepageSettings();
  await seedFundingGrants();
  await seedServices();
  await seedClubWebsiteModels();

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
