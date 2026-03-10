import type { ReactNode } from "react";
import Link from "next/link";

import Logo from "../Logo";
import { getPublicNavigationTree, getPublicSiteSettings } from "../../lib/content";

function renderNavigationLinks(
  items: Awaited<ReturnType<typeof getPublicNavigationTree>>,
  className: string,
) {
  return items.map((item) => (
    <div key={item.id} className="public-nav__group">
      <Link href={item.url} className={className}>
        {item.label}
      </Link>
      {item.children.length > 0 ? (
        <div className="public-nav__children">
          {item.children.map((child) => (
            <Link key={child.id} href={child.url} className={className}>
              {child.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  ));
}

function externalLink(url: string, label: string) {
  return (
    <Link href={url} className="public-footer__social-link" target="_blank" rel="noreferrer">
      {label}
    </Link>
  );
}

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const [siteSettings, navigation] = await Promise.all([
    getPublicSiteSettings(),
    getPublicNavigationTree(),
  ]);

  const siteTitle = siteSettings.site_title ?? "Blueprint Website";
  const siteTagline = siteSettings.site_tagline ?? "";
  const logoUrl = siteSettings.logo_url;
  const footerText = siteSettings.footer_text ?? `© ${siteTitle}`;

  return (
    <div className="public-shell">
      <header className="public-header" aria-label="Public website header">
        <div className="public-header__inner container">
          <Link href="/" aria-label="Go to homepage" className="public-brand">
            {logoUrl ? (
              <img src={logoUrl} alt={siteTitle} width={160} height={40} className="public-brand__logo" />
            ) : (
              <Logo width={160} height={40} />
            )}
            <span className="public-brand__text">
              <strong>{siteTitle}</strong>
              {siteTagline ? <span>{siteTagline}</span> : null}
            </span>
          </Link>

          <nav className="public-nav" aria-label="Public navigation">
            {navigation.length > 0 ? (
              renderNavigationLinks(navigation, "public-nav__link")
            ) : (
              <Link href="/" className="public-nav__link">
                Home
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="public-main section" id="main-content">
        <div className="public-main__inner container">{children}</div>
      </main>

      <footer className="public-footer">
        <div className="public-footer__inner container">
          <div className="public-footer__brand">
            <strong>{siteTitle}</strong>
            {siteTagline ? <p>{siteTagline}</p> : null}
            <p>{footerText}</p>
          </div>

          <nav className="public-footer__nav" aria-label="Footer navigation">
            {navigation.length > 0 ? renderNavigationLinks(navigation, "public-footer__link") : null}
          </nav>

          <div className="public-footer__social" aria-label="Social links">
            {siteSettings.facebook_url ? externalLink(siteSettings.facebook_url, "Facebook") : null}
            {siteSettings.instagram_url ? externalLink(siteSettings.instagram_url, "Instagram") : null}
            {siteSettings.youtube_url ? externalLink(siteSettings.youtube_url, "YouTube") : null}
          </div>
        </div>
      </footer>
    </div>
  );
}
