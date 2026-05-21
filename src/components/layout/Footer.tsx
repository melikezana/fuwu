"use client";

import Link from "next/link";
import {
  Camera,
  ChevronDown,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
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
  "inline-flex min-h-11 max-w-full cursor-pointer select-none items-center gap-2 rounded-md px-1 text-sm font-semibold leading-6 text-[var(--muted)] transition-colors hover:text-[var(--brand-orange-dark)] active:text-[var(--brand-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2 sm:min-h-0 sm:px-0";

const contactActionClass =
  "inline-flex min-h-11 w-full cursor-pointer select-none items-center justify-center gap-2 rounded-md border border-[rgba(13,20,36,0.1)] bg-white px-2.5 py-2 text-xs font-bold text-[var(--brand-navy)] shadow-[0_12px_30px_rgba(13,20,36,0.06)] transition-all hover:-translate-y-0.5 hover:border-[rgba(255,138,0,0.42)] hover:bg-[var(--brand-orange-soft)] active:border-[var(--brand-orange)] active:bg-[var(--brand-orange)] active:text-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2 sm:min-h-12 sm:gap-2.5 sm:px-4 sm:py-3 sm:text-sm";

function FooterAnchor({ item, className }: { className?: string; item: FooterLink }) {
  const isExternal = item.external || item.href.startsWith("http");
  const isEmail = item.href.startsWith("mailto:");
  const isPhone = item.href.startsWith("tel:");
  const Icon = item.Icon;
  const content = (
    <>
      {Icon ? (
        <span className="pointer-events-none inline-flex size-8 shrink-0 select-none items-center justify-center rounded bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]">
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
  children: React.ReactNode;
  className?: string;
  title: string;
}) {
  return (
    <section className={`grid content-start gap-4 ${className}`}>
      <h2 className="cursor-default select-none text-sm font-bold uppercase text-[var(--brand-navy)]">
        <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[var(--brand-orange)] align-middle" />
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
      Icon: Phone,
      ariaLabel: t("footer.phoneAria"),
      href: customerServiceContact.phoneHref,
      label: t("footer.phone"),
    },
    {
      Icon: MessageCircle,
      ariaLabel: t("footer.whatsappAria"),
      external: true,
      href: customerServiceContact.whatsappHref,
      label: t("footer.whatsapp"),
    },
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
      className="border-t border-[rgba(13,20,36,0.08)] bg-[linear-gradient(180deg,#FFF7EC_0%,#F8F2E8_52%,#EEF1F5_100%)] text-[var(--brand-navy)]"
      id="contact"
    >
      <Container className="py-8 sm:py-12 lg:py-14">
        <div className="max-w-2xl cursor-default select-none">
          <Link
            aria-label={t("nav.logo")}
            className="inline-flex cursor-pointer rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
            href={appRoutes.home}
          >
            <FuwuLogo size="md" />
          </Link>
          <p className="mt-4 text-sm font-semibold leading-7 text-[var(--muted)]">
            {t("footer.description")}
          </p>
        </div>

        <div className="grid gap-7 border-y border-[rgba(13,20,36,0.1)] py-7 sm:grid-cols-2 sm:gap-9 sm:py-9 lg:grid-cols-4 lg:gap-10">
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
            <details className="group rounded-lg border border-[rgba(13,20,36,0.1)] bg-white/70">
              <summary className="flex min-h-12 cursor-pointer select-none list-none items-center justify-between gap-3 px-4 text-sm font-bold uppercase text-[var(--brand-navy)] [&::-webkit-details-marker]:hidden">
                <span>
                  <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[var(--brand-orange)] align-middle" />
                  {t("footer.legal")}
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className="size-4 transition-transform group-open:rotate-180"
                />
              </summary>
              <nav
                aria-label={t("footer.policyAria")}
                className="grid gap-2.5 border-t border-[rgba(13,20,36,0.08)] px-4 py-3"
              >
                {policyLinks.map((item) => (
                  <FooterAnchor item={item} key={item.label} />
                ))}
              </nav>
            </details>
          </section>

          <FooterColumn className="sm:col-span-2 lg:col-span-4" title={t("footer.contact")}>
            <address className="grid gap-4 not-italic">
              <p className="inline-flex max-w-full cursor-default select-none items-center gap-2.5 text-sm font-semibold leading-6 text-[var(--muted)]">
                <span className="inline-flex size-8 shrink-0 items-center justify-center rounded bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]">
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

        <div className="mt-6 flex flex-col gap-3 rounded-lg border border-white/70 bg-white/55 px-4 py-4 text-sm font-semibold text-[var(--muted)] shadow-[0_12px_34px_rgba(13,20,36,0.04)] sm:flex-row sm:items-center sm:justify-between">
          <p className="cursor-default select-none">{t("footer.copyright")}</p>
          <p className="cursor-default select-none">{t("footer.tagline")}</p>
        </div>
      </Container>
    </footer>
  );
}
