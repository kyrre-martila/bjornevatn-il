import React from "react";
import "@org/ui-tokens/index.css";
import "./globals.css";

export const metadata = {
  title: "Blueprint App",
  description: "Fullstack blueprint",
};

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/api", label: "API" },
  { href: "/mobile", label: "Mobile" },
  { href: "/settings", label: "Settings" },
];

function AppShell({ children }: { children: React.ReactNode }) {
  "use client";

  const [isNavOpen, setIsNavOpen] = React.useState(false);
  const toggleNav = () => setIsNavOpen((open) => !open);

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <div className="app-shell">
        <header className="app-header" aria-label="Application header">
          <div className="app-header__inner">
            <div className="app-header__brand">
              Blueprint
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
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="app-header__nav-link">
                {item.label}
              </a>
            ))}
          </nav>
        </header>

        <div className="app-layout">
          <nav className="app-sidebar" aria-label="Primary navigation">
            <div className="app-sidebar__title">Navigation</div>
            <ul className="app-sidebar__nav">
              {navItems.map((item) => (
                <li key={item.href}>
                  <a href={item.href}>{item.label}</a>
                </li>
              ))}
            </ul>
          </nav>

          <main id="main-content" role="main" className="app-main">
            {children}
          </main>
        </div>

        <footer className="app-footer">
          © Blueprint Starter — All rights reserved.
        </footer>
      </div>
    </>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="app-root">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
