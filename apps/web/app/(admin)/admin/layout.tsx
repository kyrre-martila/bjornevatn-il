import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "../../AppShell";
import { getMe } from "../../../lib/me";
import {
  canAccessDeveloperTools,
  canAccessSchema,
  canManageTaxonomies,
  canManageUsers,
} from "../../../lib/roles";
import { hasMinimumRole } from "../../../lib/rbac";

const adminNavItems = [
  { href: "/admin/pages", label: "Pages", visible: () => true },
  { href: "/admin/content", label: "Content", visible: () => true },
  { href: "/admin/media", label: "Media", visible: () => true },
  {
    href: "/admin/redirects",
    label: "Redirects",
    visible: canManageTaxonomies,
  },
  {
    href: "/admin/navigation",
    label: "Taxonomies",
    visible: canManageTaxonomies,
  },
  { href: "/admin/users", label: "Users", visible: canManageUsers },
  {
    href: "/admin/clubhouse-bookings",
    label: "Clubhouse bookings",
    visible: canManageUsers,
  },
  {
    href: "/admin/memberships",
    label: "Memberships",
    visible: canManageUsers,
  },
  {
    href: "/admin/clubhouse-blocked",
    label: "Clubhouse blocked periods",
    visible: canManageUsers,
  },
  {
    href: "/admin/ticket-sales",
    label: "Ticket sales",
    visible: canManageUsers,
  },
  {
    href: "/admin/ticket-orders",
    label: "Ticket orders",
    visible: canManageUsers,
  },
  { href: "/admin/audit", label: "Audit log", visible: canManageUsers },
  { href: "/admin/settings", label: "Site settings", visible: canManageUsers },
  { href: "/admin/content", label: "Content models", visible: canAccessSchema },
  { href: "/admin/system", label: "System", visible: canAccessSchema },
  {
    href: "/admin/staging",
    label: "Developer tools",
    visible: canAccessDeveloperTools,
  },
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
    .filter((item) => item.visible(user.role))
    .map(({ href, label }) => ({ href, label }));

  return (
    <AppShell navItems={visibleNavItems} user={user}>
      {children}
    </AppShell>
  );
}
