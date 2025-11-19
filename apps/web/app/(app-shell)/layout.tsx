import type { ReactNode } from "react";

import { AppShell } from "../AppShell";
import { getMe } from "../../lib/me";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/api", label: "API" },
  { href: "/mobile", label: "Mobile" },
  { href: "/settings", label: "Settings" },
];

export default async function AppShellLayout({
  children,
}: {
  children: ReactNode;
}) {
  const me = await getMe();
  const user = me?.user ?? null;

  return (
    <AppShell navItems={navItems} user={user}>
      {children}
    </AppShell>
  );
}
