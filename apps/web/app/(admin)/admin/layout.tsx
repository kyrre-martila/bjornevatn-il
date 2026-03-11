import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "../../AppShell";
import { getMe } from "../../../lib/me";
import { hasMinimumRole } from "../../../lib/rbac";

const adminNavItems = [
  { href: "/admin", label: "Overview", minRole: "editor" },
  { href: "/admin/pages", label: "Pages", minRole: "editor" },
  { href: "/admin/content", label: "Content", minRole: "editor" },
  { href: "/admin/navigation", label: "Navigation", minRole: "admin" },
  { href: "/admin/settings", label: "Site settings", minRole: "admin" },
  { href: "/admin/media", label: "Media", minRole: "editor" },
  { href: "/admin/profile", label: "Profile", minRole: "editor" },
] as const;

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const me = await getMe();
  const user = me?.user ?? null;

  if (!user || !hasMinimumRole(user.role, "editor")) {
    redirect("/login");
  }

  const visibleNavItems = adminNavItems
    .filter((item) => {
      if (item.href === "/admin/content") {
        return hasMinimumRole(user.role, "editor");
      }
      return hasMinimumRole(user.role, item.minRole);
    })
    .map(({ href, label }) => ({ href, label }));

  return (
    <AppShell navItems={visibleNavItems} user={user}>
      {children}
    </AppShell>
  );
}
