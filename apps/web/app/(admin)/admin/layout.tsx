import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppShell, type AppShellNavSection } from "../../AppShell";
import { getMe } from "../../../lib/me";
import {
  canAccessDeveloperTools,
  canAccessSchema,
  canManageTaxonomies,
  canManageUsers,
} from "../../../lib/roles";
import { hasMinimumRole } from "../../../lib/rbac";

const adminNavSections = [
  {
    label: "Content",
    items: [
      { href: "/admin/pages", label: "Pages", visible: () => true },
      { href: "/admin/content", label: "Content entries", visible: () => true },
      { href: "/admin/media", label: "Media library", visible: () => true },
      {
        href: "/admin/navigation",
        label: "Navigation",
        visible: canManageTaxonomies,
      },
      {
        href: "/admin/redirects",
        label: "Redirects",
        visible: canManageTaxonomies,
      },
      {
        href: "/admin/settings",
        label: "Site settings",
        visible: canManageUsers,
      },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/users", label: "Users", visible: canManageUsers },
      {
        href: "/admin/clubhouse-bookings",
        label: "Clubhouse bookings",
        visible: canManageUsers,
      },
      {
        href: "/admin/clubhouse-blocked",
        label: "Clubhouse closures",
        visible: canManageUsers,
      },
      {
        href: "/admin/memberships",
        label: "Membership applications",
        visible: canManageUsers,
      },
      {
        href: "/admin/matches",
        label: "Matches",
        visible: canManageUsers,
      },
      {
        href: "/admin/matches/sync",
        label: "Match sync",
        visible: canManageUsers,
      },
      {
        href: "/admin/observability",
        label: "Observability",
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
    ],
  },
  {
    label: "Platform",
    items: [
      {
        href: "/admin/system",
        label: "System overview",
        visible: canAccessSchema,
      },
      {
        href: "/admin/content",
        label: "Content models",
        visible: canAccessSchema,
      },
      {
        href: "/admin/staging",
        label: "Staging",
        visible: canAccessDeveloperTools,
      },
    ],
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

  const visibleNavSections = adminNavSections
    .map((section) => ({
      label: section.label,
      items: section.items
        .filter((item) => item.visible(user.role))
        .map(({ href, label }) => ({ href, label })),
    }))
    .filter((section) => section.items.length > 0) as AppShellNavSection[];

  return (
    <AppShell navSections={visibleNavSections} user={user}>
      {children}
    </AppShell>
  );
}
