import type { ReactNode } from "react";
import Link from "next/link";

import Logo from "../Logo";

const publicNavItems = [
  { href: "/", label: "Home" },
  { href: "/news", label: "News" },
  { href: "/page/about", label: "Pages" },
  { href: "/login", label: "Admin login" },
];

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="public-shell">
      <header className="public-header" aria-label="Public website header">
        <div className="public-header__inner">
          <Link href="/" aria-label="Go to homepage">
            <Logo width={160} height={40} />
          </Link>

          <nav className="public-nav" aria-label="Public navigation">
            {publicNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="public-nav__link"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="public-main" id="main-content">
        <div className="public-main__inner">{children}</div>
      </main>

      <footer className="public-footer">© Blueprint Website</footer>
    </div>
  );
}
