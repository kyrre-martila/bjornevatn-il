"use client";

import Link from "next/link";
import React from "react";

import Logo from "./Logo";
import { PrimaryNav } from "./PrimaryNav";

type NavItem = {
  href: string;
  label: string;
};

type AppShellProps = {
  children: React.ReactNode;
  navItems: NavItem[];
};

export function AppShell({ children, navItems }: AppShellProps) {
  const [isNavOpen, setIsNavOpen] = React.useState(false);
  const toggleNav = () => setIsNavOpen((open) => !open);
  const handleNavItemClick = React.useCallback(() => {
    setIsNavOpen(false);
  }, []);

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <div className="app-shell">
        <header className="app-header" aria-label="Application header">
          <div className="app-header__inner">
            <div className="app-header__brand">
              <Link href="/" aria-label="Go to Blueprint home">
                <Logo width={160} height={40} />
              </Link>
              <span>Fullstack starter</span>
            </div>

            <button
              type="button"
              className="nav-toggle"
              aria-label="Toggle navigation"
              aria-controls="primary-nav"
              aria-expanded={isNavOpen}
              onClick={toggleNav}
            >
              <span className="sr-only">Toggle navigation</span>
              <span className="nav-toggle__bar" />
              <span className="nav-toggle__bar" />
              <span className="nav-toggle__bar" />
            </button>
          </div>

          <nav
            id="primary-nav"
            aria-label="Primary navigation"
            className={`app-header__nav${isNavOpen ? " app-header__nav--open" : ""}`}
          >
            <PrimaryNav
              items={navItems}
              variant="header"
              onItemClick={handleNavItemClick}
            />
          </nav>
        </header>

        <div className="app-layout">
          <nav className="app-sidebar" aria-label="Primary navigation">
            <div className="app-sidebar__title">Navigation</div>
            <PrimaryNav items={navItems} variant="sidebar" />
          </nav>

          <main id="main-content" role="main" className="app-main">
            <div className="app-main__inner">{children}</div>
          </main>
        </div>

        <footer className="app-footer">
          © Blueprint Starter — All rights reserved.
        </footer>
      </div>
    </>
  );
}
