import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "../../AppShell";
import { getMe } from "../../../lib/me";

const adminNavItems = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/pages", label: "Pages" },
  { href: "/admin/profile", label: "Profile" },
];

function canAccessAdmin(role: string | undefined): boolean {
  if (!role) {
    return false;
  }

  const normalized = role.toUpperCase();
  return normalized === "ADMIN" || normalized === "EDITOR";
}

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const me = await getMe();
  const user = me?.user ?? null;

  if (!user || !canAccessAdmin(user.role)) {
    redirect("/login");
  }

  return (
    <AppShell navItems={adminNavItems} user={user}>
      {children}
    </AppShell>
  );
}
