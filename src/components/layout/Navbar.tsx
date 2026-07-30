"use client";

import Link from "next/link";
import { Bell, ChevronDown, MapPin, Menu, UserRoundPlus, UsersRound, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { FuwuLogo } from "@/components/brand/FuwuLogo";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { appRoutes, type NavigationLink } from "@/lib/constants/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { CurrentUserProfile } from "@/types/auth";

const headerNavigationLinks: NavigationLink[] = [
  {
    href: appRoutes.home,
    id: "home",
    label: "Ana Sayfa",
  },
  {
    href: appRoutes.services,
    id: "services",
    label: "Hizmetler",
  },
  {
    href: appRoutes.providers,
    id: "providers",
    label: "Ustalar",
  },
  {
    href: appRoutes.howItWorks,
    id: "how-it-works",
    label: "Nasıl Çalışır?",
  },
  {
    href: appRoutes.trust,
    id: "trust",
    label: "Güven",
  },
  {
    href: "/#contact",
    id: "contact",
    label: "İletişim",
  },
];

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

function getUserDisplayName(profile: CurrentUserProfile | null, fallback: string) {
  return profile?.full_name?.trim() || fallback;
}

function getAvatarInitial(displayName: string) {
  return displayName.trim().charAt(0).toLocaleUpperCase("tr-TR") || "?";
}

export function Navbar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeHref, setActiveHref] = useState("");
  const [userProfile, setUserProfile] = useState<CurrentUserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const navRef = useRef<HTMLElement>(null);
  const userDisplayName = useMemo(
    () => getUserDisplayName(userProfile, t("nav.account")),
    [t, userProfile],
  );
  const userAvatarInitial = useMemo(() => getAvatarInitial(userDisplayName), [userDisplayName]);
  const mobileNavigationLinks = useMemo(() => {
    const links: NavigationLink[] = [
      ...headerNavigationLinks,
      {
        href: appRoutes.providerApplication,
        id: "provider-application",
        label: "Usta Ol",
      },
    ];

    if (!isAuthLoading) {
      if (userProfile) {
        links.push({
          href: userProfile.role === "admin" ? appRoutes.adminDashboard : appRoutes.account,
          id: "account",
          label: userDisplayName,
        });
        links.push({
          href: "#logout",
          id: "logout",
          label: "Çıkış Yap",
        });
      } else {
        links.push({
          href: appRoutes.login,
          id: "login",
          label: t("nav.login"),
        });
      }
    }

    return links;
  }, [isAuthLoading, t, userDisplayName, userProfile]);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    async function loadAuth() {
      try {
        const response = await fetch("/api/auth/user", { cache: "no-store" });
        if (response.ok) {
          const data = await response.json();
          if (data.authenticated && data.profile) {
            if (mounted) setUserProfile(data.profile);
          } else if (mounted) {
            setUserProfile(null);
          }
        } else if (mounted) {
          setUserProfile(null);
        }
      } catch {
        if (mounted) setUserProfile(null);
      } finally {
        if (mounted) setIsAuthLoading(false);
      }
    }

    void loadAuth();
    const {
      data: { subscription },
    } =
      supabase?.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT") {
          setUserProfile(null);
          setIsAuthLoading(false);
          return;
        }

        if (event === "SIGNED_IN" || event === "USER_UPDATED") {
          setIsAuthLoading(true);
          void loadAuth();
        }
      }) ?? { data: { subscription: null } };

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function updateActiveHref() {
      setActiveHref(getActiveHref(pathname, mobileNavigationLinks));
    }

    updateActiveHref();
    window.addEventListener("hashchange", updateActiveHref);

    return () => window.removeEventListener("hashchange", updateActiveHref);
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
    if (href === appRoutes.home) {
      return activeHref === appRoutes.home && pathname === appRoutes.home;
    }

    return activeHref === href || (!href.includes("#") && pathname === href);
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await createClient()?.auth.signOut();
    } catch {
      // Session refresh handles any transient logout issue.
    }
    setUserProfile(null);
    window.location.reload();
  }

  function handleMenuLinkClick(href: string) {
    setActiveHref(href);
    setIsMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[rgba(10,37,64,0.08)] bg-white/88 shadow-[0_10px_30px_-24px_rgba(10,37,64,0.35)] backdrop-blur-xl">
      <Container className="max-w-[1536px] py-3 xl:py-0">
        <nav
          className="relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 xl:h-[64px]"
          ref={navRef}
        >
          <Link
            aria-label={t("nav.logo")}
            className="inline-flex min-w-0 cursor-pointer rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
            href={appRoutes.home}
            onClick={() => handleMenuLinkClick(appRoutes.home)}
          >
            <FuwuLogo size="sm" />
          </Link>

          <div className="hidden min-w-0 items-center justify-center gap-6 xl:flex">
            {headerNavigationLinks.map((item) => {
              const isActive = isActiveLink(item.href);

              return (
                <Link
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative inline-flex min-h-10 cursor-pointer items-center justify-center whitespace-nowrap px-1 text-sm font-bold leading-5 text-[var(--brand-navy)] transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:bg-[var(--brand-orange)] after:transition-transform hover:text-[var(--brand-orange-dark)] hover:after:scale-x-100 focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2",
                    isActive ? "after:scale-x-100" : undefined,
                  )}
                  href={item.href}
                  key={item.id}
                  onClick={() => setActiveHref(item.href)}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="hidden min-w-0 shrink-0 items-center gap-2 xl:flex">
            <Link
              className="inline-flex h-10 min-h-10 items-center gap-2 rounded-md border border-[rgba(10,37,64,0.1)] bg-white px-3 text-sm font-bold text-[var(--brand-navy)] shadow-[var(--shadow-subtle)] transition-all hover:-translate-y-0.5 hover:border-[rgba(255,101,0,0.32)] hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
              href={appRoutes.providers}
            >
              <MapPin aria-hidden="true" className="size-4" />
              İstanbul
              <ChevronDown aria-hidden="true" className="size-3.5" />
            </Link>

            {isAuthLoading ? (
              <div aria-hidden="true" className="size-10 rounded-md bg-[var(--surface-soft)]" />
            ) : userProfile ? (
              <NotificationBell className="shrink-0" userId={userProfile.id} />
            ) : (
              <Link
                aria-label="Bildirimleri görmek için giriş yap"
                className="relative inline-flex size-10 cursor-pointer items-center justify-center rounded-md border border-[var(--border)] bg-white text-[var(--brand-navy)] shadow-[var(--shadow-subtle)] transition-colors hover:border-[rgba(255,101,0,0.46)] hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
                href={appRoutes.login}
                title="Bildirimler"
              >
                <Bell className="size-5" aria-hidden="true" />
                <span className="absolute right-2 top-2 size-1.5 rounded-full bg-[var(--brand-orange)]" />
              </Link>
            )}

            <Button
              aria-current={isActiveLink(appRoutes.providerApplication) ? "page" : undefined}
              className="h-10 min-h-10 gap-2 whitespace-nowrap rounded-md border border-[rgba(10,37,64,0.1)] bg-white px-4 text-[var(--brand-navy)] shadow-[var(--shadow-subtle)] ring-0 hover:bg-[var(--brand-orange-soft)]"
              href={appRoutes.providerApplication}
              onClick={() => setActiveHref(appRoutes.providerApplication)}
              variant="secondary"
            >
              <UserRoundPlus aria-hidden="true" className="size-4" />
              Usta Ol
            </Button>
            <Button
              aria-current={isActiveLink(appRoutes.providers) ? "page" : undefined}
              className="h-10 min-h-10 gap-2 whitespace-nowrap rounded-md px-4"
              href={appRoutes.providers}
              onClick={() => setActiveHref(appRoutes.providers)}
            >
              <UsersRound aria-hidden="true" className="size-4" />
              Usta Bul
            </Button>

            {!isAuthLoading && userProfile ? (
              <Button
                aria-label={`${userDisplayName} profiline git`}
                className="h-10 min-h-10 w-[9.25rem] min-w-0 shrink-0 justify-start gap-2 rounded-md border border-[rgba(10,37,64,0.1)] bg-white px-3 text-[var(--brand-navy)] shadow-[var(--shadow-subtle)] ring-0 hover:bg-[var(--brand-orange-soft)]"
                href={userProfile.role === "admin" ? appRoutes.adminDashboard : appRoutes.account}
                onClick={() =>
                  setActiveHref(
                    userProfile.role === "admin" ? appRoutes.adminDashboard : appRoutes.account,
                  )
                }
                title={userDisplayName}
                variant="plain"
              >
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-navy)] text-xs font-bold text-white">
                  {userAvatarInitial}
                </span>
                <span className="min-w-0 flex-1 truncate text-left">{userDisplayName}</span>
              </Button>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2 xl:hidden">
            {!isAuthLoading && userProfile ? (
              <NotificationBell panelAlign="right" userId={userProfile.id} />
            ) : (
              <Link
                aria-label="Bildirimleri görmek için giriş yap"
                className="relative inline-flex size-10 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--brand-navy)] shadow-[var(--shadow-subtle)] transition-colors hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
                href={appRoutes.login}
              >
                <Bell className="size-5" aria-hidden="true" />
              </Link>
            )}
            <button
              aria-controls="mobile-navigation-menu"
              aria-expanded={isMenuOpen}
              aria-label={isMenuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
              className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full border border-[rgba(10,37,64,0.1)] bg-white text-[var(--brand-navy)] shadow-[var(--shadow-subtle)] transition-colors hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
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
              className="absolute left-0 right-0 top-[calc(100%+0.65rem)] z-50 max-h-[min(58vh,24rem)] overflow-y-auto rounded-lg border border-[rgba(10,37,64,0.1)] bg-white py-2 shadow-[var(--shadow-elevated)] xl:hidden"
              id="mobile-navigation-menu"
            >
              <div className="grid gap-1 px-2">
                <Link
                  className="mb-1 flex min-h-11 items-center gap-2 rounded-md border border-[rgba(10,37,64,0.08)] bg-[var(--surface-soft)] px-3.5 py-2.5 text-sm font-bold text-[var(--brand-navy)]"
                  href={appRoutes.providers}
                  onClick={() => handleMenuLinkClick(appRoutes.providers)}
                >
                  <MapPin aria-hidden="true" className="size-4 text-[var(--brand-orange)]" />
                  İstanbul
                </Link>

                {mobileNavigationLinks.map((item) => {
                  const isActive = isActiveLink(item.href);
                  const itemClassName = cn(
                    "flex min-h-11 cursor-pointer select-none items-center justify-between rounded-md px-3.5 py-2.5 text-sm font-bold leading-5 transition-colors hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-1",
                    isActive
                      ? "bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]"
                      : "text-[var(--brand-navy)]",
                  );

                  if (item.href === "#logout") {
                    return (
                      <button
                        className={itemClassName}
                        key={item.id}
                        onClick={handleLogout}
                        type="button"
                      >
                        <span className="min-w-0 truncate">{item.label}</span>
                      </button>
                    );
                  }

                  return (
                    <Link
                      aria-current={isActive ? "page" : undefined}
                      className={itemClassName}
                      href={item.href}
                      key={item.id}
                      onClick={() => handleMenuLinkClick(item.href)}
                    >
                      <span className="min-w-0 truncate">{item.label}</span>
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
