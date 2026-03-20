import type { ReactNode } from "react";
import Link from "next/link";

import Logo from "../Logo";
import PublicNav from "./PublicNav";

export const dynamic = "force-dynamic";

export default function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="public-shell">
      <header className="public-header" aria-label="Public website header">
        <div className="public-header__inner container section stack stack--sm">
          <Link href="/" aria-label="Go to homepage" className="public-brand">
            <Logo width={160} height={40} />
            <span className="public-brand__text">
              <strong>Bjørnevatn IL</strong>
              <span>Bjørnevatn, Norway</span>
            </span>
          </Link>

          <nav className="public-nav cluster" aria-label="Main navigation">
            <PublicNav />
          </nav>
        </div>
      </header>

      <main className="public-main" id="main-content">
        <div className="public-main__inner container section stack">{children}</div>
      </main>

      <footer className="public-footer">
        <div className="public-footer__inner container section stack stack--sm">
          <strong>Bjørnevatn IL</strong>
          <p>Bjørnevatn, Norway</p>
          <p>Social media links placeholder</p>
        </div>
      </footer>
    </div>
  );
}
