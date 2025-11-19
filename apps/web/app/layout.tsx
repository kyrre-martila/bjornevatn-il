import "@org/ui-tokens/index.css";
import "./globals.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Blueprint App",
  description: "Fullstack blueprint",
  icons: {
    icon: [
      { url: "/favicons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicons/favicon.ico", sizes: "any" },
      { url: "/favicons/favicon.svg", type: "image/svg+xml" },
      { url: "/favicons/web-app-manifest-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/favicons/web-app-manifest-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/favicons/apple-touch-icon.png",
  },
  manifest: "/favicons/site.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className="app-root">{children}</body>
    </html>
  );
}
