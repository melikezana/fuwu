"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { FuwuLogo } from "@/components/brand/FuwuLogo";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { appRoutes, ctaLabels, navigationLinks } from "@/lib/constants/navigation";
import { cn } from "@/lib/utils";

const headerNavigationLinks = navigationLinks.filter((item) => item.id !== "providers");
const mobileNavigationLinks = [
  ...headerNavigationLinks,
  {
    id: "provider-application",
    label: ctaLabels.provider,
    href: appRoutes.providerApplication,
  },
  {
    id: "providers",
    label: ctaLabels.findProvider,
    href: appRoutes.providers,
  },
];

function getActiveHref(pathname: string) {
  if (typeof window !== "undefined" && window.location.hash) {
    const hash = window.location.hash;
    const matchingLink = mobileNavigationLinks.find(
      (item) => item.href === hash || item.href.endsWith(hash),
    );

    if (matchingLink) {
      return matchingLink.href;
    }
  }

  return pathname;
}

export function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeHref, setActiveHref] = useState("");
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function updateActiveHref() {
      setActiveHref(getActiveHref(pathname));
    }

    updateActiveHref();
    window.addEventListener("hashchange", updateActiveHref);

    return () => {
      window.removeEventListener("hashchange", updateActiveHref);
    };
  }, [pathname]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!navRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    function handleScroll() {
      setIsMenuOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isMenuOpen]);

  function isActiveLink(href: string) {
    return activeHref === href || (!href.includes("#") && pathname === href);
  }

  function handleMenuLinkClick(href: string) {
    setActiveHref(href);
    setIsMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[rgba(13,20,36,0.08)] bg-white/[0.97] shadow-[0_10px_30px_rgba(13,20,36,0.045)] backdrop-blur-xl">
      <Container className="py-3 xl:py-0">
        <nav
          className="relative flex items-center justify-between gap-3 xl:h-[72px]"
          ref={navRef}
        >
          <Link
            aria-label="Fuwu ana sayfasına git"
            className="inline-flex min-w-0 cursor-pointer rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
            onClick={() => handleMenuLinkClick(appRoutes.home)}
            href={appRoutes.home}
          >
            <FuwuLogo size="sm" />
          </Link>

          <div className="hidden min-w-0 items-center gap-0.5 xl:flex">
            {headerNavigationLinks.map((item) => (
              <Link
                aria-current={isActiveLink(item.href) ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-10 cursor-pointer items-center justify-center rounded-full px-2.5 text-center text-sm font-semibold leading-5 transition-colors hover:bg-[var(--brand-orange-soft)] hover:text-[var(--brand-navy)]",
                  isActiveLink(item.href)
                    ? "bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]"
                    : "text-[var(--muted)]",
                )}
                href={item.href}
                key={item.id}
                onClick={() => setActiveHref(item.href)}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="hidden shrink-0 items-center gap-2 xl:flex">
            <LanguageSwitcher />
            <Button
              aria-current={isActiveLink(appRoutes.providerApplication) ? "page" : undefined}
              className={cn(
                "px-4",
                isActiveLink(appRoutes.providerApplication)
                  ? "ring-2 ring-[var(--brand-orange)] ring-offset-2"
                  : undefined,
              )}
              href={appRoutes.providerApplication}
              onClick={() => setActiveHref(appRoutes.providerApplication)}
              variant="secondary"
            >
              {ctaLabels.provider}
            </Button>
            <Button
              aria-current={isActiveLink(appRoutes.providers) ? "page" : undefined}
              className={cn(
                "px-5",
                isActiveLink(appRoutes.providers)
                  ? "ring-2 ring-[var(--brand-orange)] ring-offset-2"
                  : undefined,
              )}
              href={appRoutes.providers}
              onClick={() => setActiveHref(appRoutes.providers)}
            >
              {ctaLabels.findProvider}
            </Button>
          </div>

          <div className="flex shrink-0 items-center gap-2 xl:hidden">
            <LanguageSwitcher align="right" />
            <button
              aria-controls="mobile-navigation-menu"
              aria-expanded={isMenuOpen}
              aria-label={isMenuOpen ? "Menüyü kapat" : "Menüyü aç"}
              className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full bg-[var(--brand-navy)] text-white shadow-[0_12px_28px_rgba(13,20,36,0.16)] transition-colors hover:bg-[var(--brand-navy-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
              onClick={() => setIsMenuOpen((currentValue) => !currentValue)}
              type="button"
            >
              {isMenuOpen ? (
                <X aria-hidden="true" className="size-5" />
              ) : (
                <Menu aria-hidden="true" className="size-5" />
              )}
            </button>
          </div>

          {isMenuOpen ? (
            <div
              className="absolute left-0 right-0 top-[calc(100%+0.75rem)] z-50 max-h-[min(56vh,21rem)] overflow-y-auto rounded-lg border border-[rgba(13,20,36,0.08)] bg-white py-2 shadow-[0_22px_60px_rgba(13,20,36,0.16)] xl:hidden"
              id="mobile-navigation-menu"
            >
              <div className="border-b border-[var(--border)] px-3 pb-2">
                <Link
                  aria-label="Fuwu ana sayfasına git"
                  className="inline-flex cursor-pointer rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
                  href={appRoutes.home}
                  onClick={() => handleMenuLinkClick(appRoutes.home)}
                >
                  <FuwuLogo size="sm" />
                </Link>
              </div>
              <div className="grid gap-1 px-2">
                {mobileNavigationLinks.map((item) => {
                  const isActive = isActiveLink(item.href);

                  return (
                    <Link
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex min-h-11 cursor-pointer select-none items-center justify-between rounded-md px-3.5 py-2.5 text-sm font-bold leading-5 transition-colors hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-1",
                        isActive
                          ? "bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]"
                          : "text-[var(--brand-navy)]",
                      )}
                      href={item.href}
                      key={item.id}
                      onClick={() => handleMenuLinkClick(item.href)}
                    >
                      <span>{item.label}</span>
                      {isActive ? (
                        <span className="h-2 w-2 rounded-full bg-[var(--brand-orange)]" />
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}
        </nav>
      </Container>
    </header>
  );
}
