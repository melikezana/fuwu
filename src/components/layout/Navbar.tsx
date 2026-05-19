"use client";

<<<<<<< HEAD
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { FuwuLogo } from "@/components/brand/FuwuLogo";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { appRoutes, navigationLinks } from "@/lib/constants/navigation";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const navLabelKeys: Record<string, TranslationKey> = {
  about: "nav.about",
  contact: "nav.contact",
  "how-it-works": "nav.howItWorks",
  "provider-application": "cta.provider",
  providers: "nav.providers",
  services: "nav.services",
  trust: "nav.trust",
};

const headerNavigationLinks = navigationLinks.filter((item) => item.id !== "providers");

function getActiveHref(pathname: string, links: Array<{ href: string }>) {
  if (typeof window !== "undefined" && window.location.hash) {
    const hash = window.location.hash;
    const matchingLink = links.find((item) => item.href === hash || item.href.endsWith(hash));

    if (matchingLink) {
      return matchingLink.href;
    }
  }

  return pathname;
}

export function Navbar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeHref, setActiveHref] = useState("");
  const navRef = useRef<HTMLElement>(null);
  const translatedHeaderNavigationLinks = useMemo(
    () =>
      headerNavigationLinks.map((item) => ({
        ...item,
        label: t(navLabelKeys[item.id] ?? "nav.services"),
      })),
    [t],
  );
  const mobileNavigationLinks = useMemo(
    () => [
      ...translatedHeaderNavigationLinks,
      {
        id: "provider-application",
        label: t("cta.provider"),
        href: appRoutes.providerApplication,
      },
      {
        id: "providers",
        label: t("cta.findProvider"),
        href: appRoutes.providers,
      },
    ],
    [t, translatedHeaderNavigationLinks],
  );

  useEffect(() => {
    function updateActiveHref() {
      setActiveHref(getActiveHref(pathname, mobileNavigationLinks));
    }

    updateActiveHref();
    window.addEventListener("hashchange", updateActiveHref);

    return () => {
      window.removeEventListener("hashchange", updateActiveHref);
    };
  }, [mobileNavigationLinks, pathname]);

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
            aria-label={t("nav.logo")}
            className="inline-flex min-w-0 cursor-pointer rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
            onClick={() => handleMenuLinkClick(appRoutes.home)}
            href={appRoutes.home}
          >
            <FuwuLogo size="sm" />
          </Link>

          <div className="hidden min-w-0 items-center gap-0.5 xl:flex">
            {translatedHeaderNavigationLinks.map((item) => (
              <Link
                aria-current={isActiveLink(item.href) ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-10 cursor-pointer items-center justify-center rounded-full px-2.5 text-center text-sm font-semibold leading-5 transition-colors hover:bg-[var(--brand-orange-soft)] hover:text-[var(--brand-navy)] active:bg-[var(--brand-orange)] active:text-white",
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
              {t("cta.provider")}
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
              {t("cta.findProvider")}
            </Button>
          </div>

          <div className="flex shrink-0 items-center gap-2 xl:hidden">
            <LanguageSwitcher align="right" />
            <button
              aria-controls="mobile-navigation-menu"
              aria-expanded={isMenuOpen}
              aria-label={isMenuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
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
              className="absolute left-0 right-0 top-[calc(100%+0.65rem)] z-50 max-h-[min(48vh,18rem)] overflow-y-auto rounded-lg border border-[rgba(13,20,36,0.08)] bg-white py-2 shadow-[0_22px_60px_rgba(13,20,36,0.16)] xl:hidden"
              id="mobile-navigation-menu"
            >
              <div className="grid gap-1 px-2">
                {mobileNavigationLinks.map((item) => {
                  const isActive = isActiveLink(item.href);

                  return (
                    <Link
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex min-h-11 cursor-pointer select-none items-center justify-between rounded-md px-3.5 py-2.5 text-sm font-bold leading-5 transition-colors hover:bg-[var(--brand-orange-soft)] active:bg-[var(--brand-orange)] active:text-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-1",
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
=======
import { useState } from "react";
import Button from "@/components/common/Button";
import { useTranslation, SupportedLanguage } from "@/lib/i18n";
import { Menu, X, Globe } from "lucide-react";
import Link from "next/link";

export default function Navbar() {
  const { t, language, changeLanguage } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-gray-200 bg-white/90 backdrop-blur-md px-6 py-4 shadow-sm transition-all">
      <Link href="/" className="text-2xl font-bold text-[#FF8A00]">Fuwu</Link>

      {/* Desktop Menu */}
      <div className="hidden md:flex items-center gap-6 text-sm font-medium">
        <Link href="/providers" className="hover:text-[#FF8A00] transition-colors">
          Ustalar
        </Link>
        <Link href="/request" className="hover:text-[#FF8A00] transition-colors">
          Hizmet İste
        </Link>
        <Link href="/provider/apply" className="hover:text-[#FF8A00] transition-colors">
          Usta Ağına Katıl
        </Link>
        
        <div className="flex items-center gap-2 border-l border-gray-200 pl-6 ml-2">
          <Globe size={16} className="text-gray-400" />
          <select 
            value={language} 
            onChange={(e) => changeLanguage(e.target.value as SupportedLanguage)}
            className="bg-transparent text-sm text-gray-600 outline-none cursor-pointer hover:text-[#0D1424]"
          >
            <option value="tr">TR</option>
            <option value="en">EN</option>
            <option value="ar">العربية</option>
          </select>
        </div>

        <Link href="/login">
          <Button className="px-5 py-2">Giriş Yap</Button>
        </Link>
      </div>

      {/* Mobile Toggle */}
      <div className="flex items-center gap-4 md:hidden">
        <select 
          value={language} 
          onChange={(e) => changeLanguage(e.target.value as SupportedLanguage)}
          className="bg-transparent text-sm text-gray-600 outline-none cursor-pointer"
        >
          <option value="tr">TR</option>
          <option value="en">EN</option>
          <option value="ar">ع</option>
        </select>
        
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="text-gray-600 hover:text-[#FF8A00]"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Dropdown (Compact) */}
      {isMenuOpen && (
        <div className="absolute top-full left-0 w-full bg-white border-b border-gray-200 shadow-lg py-4 px-6 flex flex-col gap-4 md:hidden">
          <Link href="/providers" className="text-gray-600 font-medium hover:text-[#FF8A00]">
            Ustalar
          </Link>
          <Link href="/request" className="text-gray-600 font-medium hover:text-[#FF8A00]">
            Hizmet İste
          </Link>
          <Link href="/provider/apply" className="text-gray-600 font-medium hover:text-[#FF8A00]">
            Usta Ağına Katıl
          </Link>
          <Link href="/login" className="w-full">
            <Button className="w-full py-2.5 mt-2">Giriş Yap</Button>
          </Link>
        </div>
      )}
    </nav>
>>>>>>> 41e55ab (Full marketplace backend auth and production update)
  );
}
