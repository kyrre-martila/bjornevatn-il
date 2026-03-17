"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/teams", label: "Teams" },
  { href: "/about", label: "About" },
  { href: "/clubhouse", label: "Clubhouse" },
  { href: "/tickets", label: "Buy Tickets" },
  { href: "/membership", label: "Become Member" },
] as const;

export default function PublicNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <ul className="public-nav__list" role="list">
      {NAV_ITEMS.map((item) => (
        <li key={item.href} className="public-nav__group">
          <Link
            href={item.href}
            className={`public-nav__link${isActive(item.href) ? " public-nav__link--active" : ""}`}
            aria-current={isActive(item.href) ? "page" : undefined}
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
