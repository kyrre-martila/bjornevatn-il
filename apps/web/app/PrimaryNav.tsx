"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { AppShellNavSection } from "./AppShell";

type PrimaryNavProps = {
  sections: AppShellNavSection[];
  variant: "header" | "sidebar";
  onItemClick?: () => void;
};

export function PrimaryNav({ sections, variant, onItemClick }: PrimaryNavProps) {
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
      <div className="app-sidebar__nav-groups">
        {sections.map((section) => (
          <div key={section.label} className="app-sidebar__nav-group">
            <div className="app-sidebar__nav-group-label">{section.label}</div>
            <ul className="app-sidebar__nav">
              {section.items.map((item) => {
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
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="app-header__nav-groups">
      {sections.map((section) => (
        <div key={section.label} className="app-header__nav-group">
          <div className="app-header__nav-group-label">{section.label}</div>
          <div className="app-header__nav-group-items">
            {section.items.map((item) => {
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
          </div>
        </div>
      ))}
    </div>
  );
}
