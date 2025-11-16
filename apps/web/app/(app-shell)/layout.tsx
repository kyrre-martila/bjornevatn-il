import type { ReactNode } from "react";
import { AppShell } from "../AppShell";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/api", label: "API" },
  { href: "/mobile", label: "Mobile" },
  { href: "/settings", label: "Settings" },
];

export default function AppShellLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AppShell navItems={navItems}>{children}</AppShell>;
}
