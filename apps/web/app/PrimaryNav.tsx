"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
};

type PrimaryNavProps = {
  items: NavItem[];
  variant: "header" | "sidebar";
  onItemClick?: () => void;
};

export function PrimaryNav({ items, variant, onItemClick }: PrimaryNavProps) {
  const pathname = usePathname();

  const isActive = React.useCallback(
    (href: string) => {
      if (!pathname) return false;

      if (href === "/") {
        return pathname === "/";
      }

      return href !== "/" && pathname.startsWith(href);
    },
    [pathname],
  );

  if (variant === "sidebar") {
    return (
      <ul className="app-sidebar__nav">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`app-sidebar__nav-link${
                  active ? " app-sidebar__nav-link--active" : ""
                }`}
                onClick={onItemClick}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <>
      {items.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`app-header__nav-link${
              active ? " app-header__nav-link--active" : ""
            }`}
            onClick={onItemClick}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
