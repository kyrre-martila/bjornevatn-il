import type { ReactNode } from "react";

import { AppShell } from "../../AppShell";
import { getMe } from "../../../lib/me";

const adminNavItems = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/profile", label: "Profile" },
];

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const me = await getMe();
  const user = me?.user ?? null;

  return (
    <AppShell navItems={adminNavItems} user={user}>
      {children}
    </AppShell>
  );
}
