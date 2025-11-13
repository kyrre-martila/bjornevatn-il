import "@org/ui-tokens/index.css";
import "./globals.css";

import type { ReactNode } from "react";
import { AppShell } from "./AppShell";

export const metadata = {
  title: "Blueprint App",
  description: "Fullstack blueprint",
};

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/api", label: "API" },
  { href: "/mobile", label: "Mobile" },
  { href: "/settings", label: "Settings" },
];

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className="app-root">
        <AppShell navItems={navItems}>{children}</AppShell>
      </body>
    </html>
  );
}
