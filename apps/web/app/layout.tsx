import "@org/ui-tokens/index.css";
import "./globals.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";

import { getSeoSettings } from "../lib/seo";
import { StagingBanner } from "./StagingBanner";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoSettings();

  return {
    metadataBase: new URL(seo.siteUrl),
    title: seo.siteTitle,
    description: seo.siteDescription,
    icons: {
      icon: seo.favicon ? [{ url: seo.favicon }] : undefined,
      apple: seo.appleTouchIcon ?? undefined,
    },
    manifest: seo.manifestIcon ?? "/favicons/site.webmanifest",
  };
}

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="no">
      <body className="app-root">
        <StagingBanner />
        {children}
      </body>
    </html>
  );
}
