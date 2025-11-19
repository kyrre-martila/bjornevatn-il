"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";

import Logo from "./Logo";
import { PrimaryNav } from "./PrimaryNav";
import { type UserProfile } from "../lib/me";

function getInitialsFromUser(user: UserProfile): string {
  if (user.firstName || user.lastName) {
    const first = user.firstName?.[0] ?? "";
    const last = user.lastName?.[0] ?? "";
    const initials = (first + last).trim();
    if (initials) return initials.toUpperCase();
  }
  if (user.displayName) {
    return user.displayName.charAt(0).toUpperCase();
  }
  return user.email.charAt(0).toUpperCase();
}

type NavItem = {
  href: string;
  label: string;
};

type AppShellProps = {
  children: React.ReactNode;
  navItems: NavItem[];
  user?: UserProfile | null;
};

export function AppShell({ children, navItems, user }: AppShellProps) {
  const router = useRouter();
  const [isNavOpen, setIsNavOpen] = React.useState(false);
  const toggleNav = () => setIsNavOpen((open) => !open);
  const handleNavItemClick = React.useCallback(() => {
    setIsNavOpen(false);
  }, []);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = React.useState(false);
  const toggleAccountMenu = () => setIsAccountMenuOpen((open) => !open);
  const closeAccountMenu = () => setIsAccountMenuOpen(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (e) {
      // best-effort; ignore errors
    } finally {
      closeAccountMenu();
      router.push("/login");
    }
  };

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

            <div className="app-header__right">
              {user ? (
                <div className="app-header__account">
                  <button
                    type="button"
                    className="app-header__avatar"
                    aria-haspopup="menu"
                    aria-expanded={isAccountMenuOpen}
                    onClick={toggleAccountMenu}
                  >
                    <span className="app-header__avatar-initials">
                      {getInitialsFromUser(user)}
                    </span>
                  </button>

                  {isAccountMenuOpen && (
                    <div className="app-header__account-menu" role="menu">
                      <Link
                        href="/profile"
                        className="app-header__account-menu-item"
                        role="menuitem"
                        onClick={closeAccountMenu}
                      >
                        Profile
                      </Link>
                      <button
                        type="button"
                        className="app-header__account-menu-item"
                        role="menuitem"
                        onClick={handleLogout}
                      >
                        Log out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link href="/login" className="app-header__login-button">
                  Log in
                </Link>
              )}

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
