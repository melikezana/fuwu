"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  Camera,
  ChevronDown,
  Mail,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import { FuwuLogo } from "@/components/brand/FuwuLogo";
import { Container } from "@/components/ui/Container";
import { customerServiceContact } from "@/lib/constants/contact";
import { appRoutes } from "@/lib/constants/navigation";
import { useI18n } from "@/lib/i18n";

type FooterLink = {
  ariaLabel?: string;
  external?: boolean;
  href: string;
  Icon?: LucideIcon;
  label: string;
};

type ContactAction = FooterLink & {
  Icon: LucideIcon;
};

const footerLinkClass =
  "inline-flex min-h-11 max-w-full cursor-pointer select-none items-center gap-2 rounded-md px-1 text-sm font-semibold leading-6 text-[#F9F8F5]/60 transition-colors hover:text-[#FF8A33] active:text-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:ring-offset-2 focus:ring-offset-[#0F0F0F] sm:min-h-0 sm:px-0";

const contactActionClass =
  "inline-flex min-h-11 w-full cursor-pointer select-none items-center justify-center gap-2 rounded-md border border-[#F9F8F5]/10 bg-[#1F1F23] px-2.5 py-2 text-xs font-bold text-[#F9F8F5] shadow-[0_18px_44px_-32px_rgba(0,0,0,0.9)] transition-all hover:-translate-y-0.5 hover:border-[#FF6B00]/40 hover:bg-[#F9F8F5]/[0.06] active:border-[#FF6B00] active:bg-[#FF6B00] active:text-[#0F0F0F] focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:ring-offset-2 focus:ring-offset-[#0F0F0F] sm:min-h-12 sm:gap-2.5 sm:px-4 sm:py-3 sm:text-sm";

function FooterAnchor({ item, className }: { className?: string; item: FooterLink }) {
  const isExternal = item.external || item.href.startsWith("http");
  const isEmail = item.href.startsWith("mailto:");
  const isPhone = item.href.startsWith("tel:");
  const Icon = item.Icon;
  const content = (
    <>
      {Icon ? (
        <span className="pointer-events-none inline-flex size-8 shrink-0 select-none items-center justify-center rounded-md bg-[#FF6B00]/10 text-[#FF8A33]">
          <Icon aria-hidden="true" className="size-4" />
        </span>
      ) : null}
      <span className="pointer-events-none min-w-0 select-none">{item.label}</span>
    </>
  );

  if (isExternal || isEmail || isPhone) {
    return (
      <a
        aria-label={item.ariaLabel ?? item.label}
        className={className ?? footerLinkClass}
        href={item.href}
        rel={isExternal ? "noopener noreferrer" : undefined}
        target={isExternal ? "_blank" : undefined}
      >
        {content}
      </a>
    );
  }

  return (
    <Link aria-label={item.ariaLabel ?? item.label} className={className ?? footerLinkClass} href={item.href}>
      {content}
    </Link>
  );
}

function FooterColumn({
  children,
  className = "",
  title,
}: {
  children: ReactNode;
  className?: string;
  title: string;
}) {
  return (
    <section className={`grid content-start gap-4 ${className}`}>
      <h2 className="cursor-default select-none text-sm font-bold uppercase text-[#F9F8F5]">
        <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#FF6B00] align-middle" />
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Footer() {
  const { t } = useI18n();
  const discoverLinks: FooterLink[] = [
    { label: t("cta.findProvider"), href: appRoutes.providers },
    { label: t("nav.services"), href: appRoutes.services },
    { label: t("cta.request"), href: appRoutes.request },
    { label: t("cta.provider"), href: appRoutes.providerApplication },
  ];
  const companyLinks: FooterLink[] = [
    { label: t("nav.about"), href: appRoutes.about },
    { label: t("nav.howItWorks"), href: appRoutes.howItWorks },
    { label: t("nav.trust"), href: appRoutes.trust },
    { label: t("footer.faq"), href: appRoutes.faq },
    { label: t("nav.contact"), href: appRoutes.contact },
  ];
  const policyLinks: FooterLink[] = [
    { label: t("footer.kvkk"), href: appRoutes.kvkk },
    { label: t("footer.privacy"), href: appRoutes.privacy },
    { label: t("footer.terms"), href: appRoutes.terms },
    { label: t("footer.cookies"), href: appRoutes.cookies },
  ];
  const contactActions: ContactAction[] = [
    {
      Icon: Mail,
      ariaLabel: t("footer.emailAria"),
      href: `mailto:${customerServiceContact.email}`,
      label: t("footer.email"),
    },
    {
      Icon: Camera,
      ariaLabel: t("footer.instagramAria"),
      external: true,
      href: customerServiceContact.instagramHref,
      label: "Instagram",
    },
  ];

  return (
    <footer
      className="border-t border-[#F9F8F5]/10 bg-[#0F0F0F] text-[#F9F8F5]"
      id="contact"
    >
      <Container className="py-8 sm:py-12 lg:py-14">
        <div className="max-w-2xl cursor-default select-none">
          <Link
            aria-label={t("nav.logo")}
            className="inline-flex cursor-pointer rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:ring-offset-2 focus:ring-offset-[#0F0F0F]"
            href={appRoutes.home}
          >
            <FuwuLogo inverted size="md" />
          </Link>
          <p className="mt-4 text-sm font-semibold leading-7 text-[#F9F8F5]/60">
            {t("footer.description")}
          </p>
        </div>

        <div className="grid gap-7 border-y border-[#F9F8F5]/10 py-7 sm:grid-cols-2 sm:gap-9 sm:py-9 lg:grid-cols-4 lg:gap-10">
          <FooterColumn title={t("footer.discover")}>
            <nav aria-label={t("footer.discoverAria")} className="grid gap-2.5">
              {discoverLinks.map((item) => (
                <FooterAnchor item={item} key={item.label} />
              ))}
            </nav>
          </FooterColumn>

          <FooterColumn title={t("footer.company")}>
            <nav aria-label={t("footer.companyAria")} className="grid gap-2.5">
              {companyLinks.map((item) => (
                <FooterAnchor item={item} key={item.label} />
              ))}
            </nav>
          </FooterColumn>

          <FooterColumn className="hidden sm:grid" title={t("footer.policies")}>
            <nav aria-label={t("footer.policyAria")} className="grid gap-2.5">
              {policyLinks.map((item) => (
                <FooterAnchor item={item} key={item.label} />
              ))}
            </nav>
          </FooterColumn>

          <section className="sm:hidden">
            <details className="group rounded-lg border border-[#F9F8F5]/10 bg-[#17171A]">
              <summary className="flex min-h-12 cursor-pointer select-none list-none items-center justify-between gap-3 px-4 text-sm font-bold uppercase text-[#F9F8F5] [&::-webkit-details-marker]:hidden">
                <span>
                  <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#FF6B00] align-middle" />
                  {t("footer.legal")}
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className="size-4 transition-transform group-open:rotate-180"
                />
              </summary>
              <nav
                aria-label={t("footer.policyAria")}
                className="grid gap-2.5 border-t border-[#F9F8F5]/10 px-4 py-3"
              >
                {policyLinks.map((item) => (
                  <FooterAnchor item={item} key={item.label} />
                ))}
              </nav>
            </details>
          </section>

          <FooterColumn className="sm:col-span-2 lg:col-span-4" title={t("footer.contact")}>
            <address className="grid gap-4 not-italic">
              <p className="inline-flex max-w-full cursor-default select-none items-center gap-2.5 text-sm font-semibold leading-6 text-[#F9F8F5]/60">
                <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-[#FF6B00]/10 text-[#FF8A33]">
                  <MapPin aria-hidden="true" className="size-4" />
                </span>
                <span>{t("footer.location")}</span>
              </p>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                {contactActions.map((item) => (
                  <FooterAnchor className={contactActionClass} item={item} key={item.label} />
                ))}
              </div>
            </address>
          </FooterColumn>
        </div>

        <div className="mt-6 flex flex-col gap-3 rounded-lg border border-[#F9F8F5]/10 bg-[#17171A] px-4 py-4 text-sm font-semibold text-[#F9F8F5]/50 shadow-[0_18px_44px_-34px_rgba(0,0,0,0.9)] sm:flex-row sm:items-center sm:justify-between">
          <p className="cursor-default select-none">{t("footer.copyright")}</p>
          <p className="cursor-default select-none">{t("footer.tagline")}</p>
        </div>
      </Container>
    </footer>
  );
}
