import Link from "next/link";
import {
  Camera,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  type LucideIcon,
} from "lucide-react";
import { FuwuLogo } from "@/components/brand/FuwuLogo";
import { Container } from "@/components/ui/Container";
import { customerServiceContact } from "@/lib/constants/contact";
import { appRoutes, ctaLabels } from "@/lib/constants/navigation";

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
  "inline-flex max-w-full cursor-pointer select-none items-center gap-2.5 text-sm font-medium leading-6 text-[var(--muted)] transition-colors hover:text-[var(--brand-orange-dark)] focus-visible:text-[var(--brand-orange-dark)]";

const contactActionClass =
  "inline-flex min-h-11 cursor-pointer select-none items-center justify-center gap-2.5 rounded-md border border-[rgba(13,20,36,0.1)] bg-white/88 px-4 text-sm font-bold text-[var(--brand-navy)] shadow-[0_12px_30px_rgba(13,20,36,0.06)] transition-all hover:-translate-y-0.5 hover:border-[rgba(255,138,0,0.42)] hover:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2";

const discoverLinks: FooterLink[] = [
  { label: "Usta Bul", href: appRoutes.providers },
  { label: "Hizmetler", href: appRoutes.services },
  { label: "Hizmet Talep Et", href: appRoutes.request },
  { label: ctaLabels.provider, href: appRoutes.providerApplication },
];

const companyLinks: FooterLink[] = [
  { label: "Hakkımızda", href: appRoutes.about },
  { label: "Nasıl Çalışır?", href: appRoutes.howItWorks },
  { label: "Fuwu Güvencesi", href: appRoutes.trust },
  { label: "SSS", href: appRoutes.faq },
  { label: "İletişim", href: appRoutes.contact },
  { label: "Gizlilik", href: appRoutes.privacy },
];

const contactLinks: FooterLink[] = [
  {
    Icon: Phone,
    ariaLabel: "Fuwu müşteri hizmetlerini ara",
    href: customerServiceContact.phoneHref,
    label: `Müşteri Hizmetleri: ${customerServiceContact.displayPhone}`,
  },
  {
    Icon: Mail,
    ariaLabel: "Fuwu destek e-postası gönder",
    href: `mailto:${customerServiceContact.email}`,
    label: customerServiceContact.email,
  },
  {
    Icon: Camera,
    ariaLabel: "Fuwu Instagram hesabını yeni sekmede aç",
    external: true,
    href: customerServiceContact.instagramHref,
    label: `Instagram: ${customerServiceContact.instagramHandle}`,
  },
];

const contactActions: ContactAction[] = [
  {
    Icon: Phone,
    ariaLabel: "Müşteri hizmetlerini telefonla ara",
    href: customerServiceContact.phoneHref,
    label: "Telefon",
  },
  {
    Icon: MessageCircle,
    ariaLabel: "Fuwu müşteri hizmetlerine WhatsApp üzerinden yaz",
    external: true,
    href: customerServiceContact.whatsappHref,
    label: "WhatsApp",
  },
  {
    Icon: Mail,
    ariaLabel: "Fuwu müşteri hizmetlerine e-posta gönder",
    href: `mailto:${customerServiceContact.email}`,
    label: "E-posta",
  },
  {
    Icon: Camera,
    ariaLabel: "Fuwu Instagram hesabını yeni sekmede aç",
    external: true,
    href: customerServiceContact.instagramHref,
    label: "Instagram",
  },
];

function FooterAnchor({ item, className }: { className?: string; item: FooterLink }) {
  const isExternal = item.external || item.href.startsWith("http");
  const isEmail = item.href.startsWith("mailto:");
  const isPhone = item.href.startsWith("tel:");
  const Icon = item.Icon;
  const content = (
    <>
      {Icon ? (
        <span className="pointer-events-none inline-flex size-7 shrink-0 select-none items-center justify-center rounded bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]">
          <Icon aria-hidden="true" className="size-4" />
        </span>
      ) : null}
      <span className="pointer-events-none min-w-0 select-none break-words">{item.label}</span>
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
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="grid content-start gap-4">
      <h2 className="cursor-default select-none text-sm font-bold uppercase text-[var(--brand-navy)]">
        <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[var(--brand-orange)] align-middle" />
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-[rgba(13,20,36,0.08)] bg-[linear-gradient(180deg,#FFF7EC_0%,#F8F2E8_52%,#EEF1F5_100%)] text-[var(--brand-navy)]">
      <Container className="py-10 sm:py-12 lg:py-14">
        <div className="grid gap-8 border-b border-[rgba(13,20,36,0.1)] pb-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="max-w-2xl">
            <Link aria-label="Fuwu ana sayfa" className="inline-flex cursor-pointer" href={appRoutes.home}>
              <FuwuLogo size="md" />
            </Link>
            <p className="mt-4 cursor-default select-none text-sm font-medium leading-7 text-[var(--muted)]">
              Fuwu, İstanbul’da hizmet arayan müşteriler ile güvenilir yerel ustaları aynı
              pazaryeri deneyiminde buluşturur. Hizmetini seç, profilleri karşılaştır ve doğrudan
              iletişime geç.
            </p>
          </div>

          <div className="grid gap-3 lg:justify-items-end">
            <p className="cursor-default select-none text-sm font-bold uppercase text-[var(--brand-navy)]">
              Hızlı iletişim
            </p>
            <div className="flex flex-wrap gap-2.5">
              {contactActions.map((item) => (
                <FooterAnchor className={contactActionClass} item={item} key={item.label} />
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-9 py-9 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
          <FooterColumn title="Keşfet">
            <nav aria-label="Keşfet bağlantıları" className="grid gap-2.5">
              {discoverLinks.map((item) => (
                <FooterAnchor item={item} key={item.label} />
              ))}
            </nav>
          </FooterColumn>

          <FooterColumn title="Şirket">
            <nav aria-label="Şirket bağlantıları" className="grid gap-2.5">
              {companyLinks.map((item) => (
                <FooterAnchor item={item} key={item.label} />
              ))}
            </nav>
          </FooterColumn>

          <FooterColumn title="İletişim">
            <address className="grid gap-2.5 not-italic" id="contact">
              {contactLinks.map((item) => (
                <FooterAnchor item={item} key={item.label} />
              ))}
              <p className="inline-flex max-w-full cursor-default select-none items-center gap-2.5 text-sm font-medium leading-6 text-[var(--muted)]">
                <span className="inline-flex size-7 shrink-0 items-center justify-center rounded bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]">
                  <MapPin aria-hidden="true" className="size-4" />
                </span>
                <span>İstanbul, Türkiye</span>
              </p>
            </address>
          </FooterColumn>

          <FooterColumn title="Web deneyimi">
            <div className="grid gap-4">
              <p className="cursor-default select-none text-sm font-medium leading-7 text-[var(--muted)]">
                Masaüstü, tablet ve mobil tarayıcılarda usta arama, filtreleme ve doğrudan
                iletişim akışını rahat kullanman için hazırlanır.
              </p>
              <Link
                className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-md bg-[var(--brand-orange)] px-4 text-center text-sm font-bold text-white shadow-[0_14px_30px_rgba(255,138,0,0.18)] transition-colors hover:bg-[var(--brand-orange-dark)] sm:w-fit"
                href={appRoutes.providers}
              >
                Ustaları İncele
              </Link>
            </div>
          </FooterColumn>
        </div>

        <div className="mb-8 grid gap-5 rounded-lg border border-[rgba(13,20,36,0.1)] bg-white/78 p-5 shadow-[0_18px_48px_rgba(13,20,36,0.06)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-6">
          <div className="cursor-default select-none">
            <h2 className="text-2xl font-bold leading-tight text-[var(--brand-navy)]">
              Yardıma mı ihtiyacın var?
            </h2>
            <p className="mt-2 text-sm font-medium leading-7 text-[var(--muted)]">
              Müşteri Hizmetleri: {customerServiceContact.displayPhone}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:justify-end">
            {contactActions.map((item) => (
              <FooterAnchor className={contactActionClass} item={item} key={item.label} />
            ))}
          </div>
        </div>

        <div
          className="rounded-lg border border-[rgba(13,20,36,0.1)] bg-white/70 p-4 text-sm font-medium leading-6 text-[var(--muted)]"
          id="privacy"
        >
          <p className="cursor-default select-none">
            Gizlilik talepleri ve veri işleme soruları için Fuwu ekibine{" "}
            <a
              className="cursor-pointer select-none font-bold text-[var(--brand-navy)] underline decoration-[var(--brand-orange)] decoration-2 underline-offset-4"
              href={`mailto:${customerServiceContact.email}`}
            >
              {customerServiceContact.email}
            </a>{" "}
            üzerinden ulaşabilirsiniz.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-[rgba(13,20,36,0.1)] pt-6 text-sm font-semibold text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
          <p className="cursor-default select-none">© 2026 Fuwu Hizmet</p>
          <p className="cursor-default select-none">Ustaya ulaşmanın en hızlı yolu.</p>
        </div>
      </Container>
    </footer>
  );
}
