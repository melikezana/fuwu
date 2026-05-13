import Link from "next/link";
import { Camera, Globe2, Mail, MapPin, type LucideIcon } from "lucide-react";
import { FuwuLogo } from "@/components/brand/FuwuLogo";
import { Container } from "@/components/common/Container";
import { appRoutes } from "@/constants/navigation";

type FooterLink = {
  external?: boolean;
  href: string;
  Icon?: LucideIcon;
  label: string;
};

type SocialLink = FooterLink & {
  Icon: LucideIcon;
};

const footerLinkClass =
  "inline-flex max-w-full cursor-pointer select-none items-center gap-2.5 text-sm font-semibold leading-6 text-white/82 transition-colors hover:text-white focus-visible:text-white";

const discoverLinks: FooterLink[] = [
  { label: "Usta Bul", href: "/providers" },
  { label: "Hizmetler", href: "/#services" },
  { label: "Nasıl Çalışır?", href: "/#how-it-works" },
  { label: "Fuwu Güvencesi", href: "/#trust" },
  { label: "Sık Sorulan Sorular", href: "/#faq" },
];

const companyLinks: FooterLink[] = [
  { label: "Hakkımızda", href: "/#about" },
  { label: "Giriş Yakında", href: "/login" },
  { label: "Usta Ağına Katıl", href: "/provider-application" },
  { label: "Usta Paneli", href: appRoutes.providerDashboard },
  { label: "Hizmet Talep Et", href: "/request" },
  { label: "Gizlilik", href: "/#privacy" },
];

const contactLinks: FooterLink[] = [
  { Icon: Mail, label: "fuwuhizmet@gmail.com", href: "mailto:fuwuhizmet@gmail.com" },
  { Icon: Globe2, label: "fuwu.com.tr", href: "https://fuwu.com.tr", external: true },
  { Icon: Camera, label: "Instagram: fuwuapp", href: "https://instagram.com/fuwuapp", external: true },
];

const socialLinks: SocialLink[] = [
  {
    Icon: Camera,
    label: "Instagram",
    href: "https://instagram.com/fuwuapp",
    external: true,
  },
  { Icon: Mail, label: "E-posta", href: "mailto:fuwuhizmet@gmail.com" },
  { Icon: Globe2, label: "Web sitesi", href: "https://fuwu.com.tr", external: true },
];

function FooterAnchor({ item, className }: { className?: string; item: FooterLink }) {
  const isExternal = item.external || item.href.startsWith("http");
  const isEmail = item.href.startsWith("mailto:");
  const Icon = item.Icon;
  const content = (
    <>
      {Icon ? (
        <span className="pointer-events-none inline-flex size-7 shrink-0 select-none items-center justify-center rounded bg-white/10 text-[var(--brand-orange)]">
          <Icon aria-hidden="true" className="size-4" />
        </span>
      ) : null}
      <span className="pointer-events-none min-w-0 select-none break-words">{item.label}</span>
    </>
  );

  if (isExternal || isEmail) {
    return (
      <a
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
    <Link className={className ?? footerLinkClass} href={item.href}>
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
      <h2 className="cursor-default select-none text-sm font-black uppercase text-white">
        <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[var(--brand-orange)] align-middle" />
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Footer() {
  return (
    <footer className="bg-[var(--brand-navy)] text-white">
      <Container className="py-10 sm:py-12 lg:py-14">
        <div className="grid gap-8 border-b border-white/14 pb-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="max-w-2xl">
            <Link aria-label="Fuwu ana sayfa" className="inline-flex cursor-pointer" href="/">
              <FuwuLogo inverted size="md" />
            </Link>
            <p className="mt-4 cursor-default select-none text-sm font-semibold leading-7 text-white/78">
              Fuwu, İstanbul’da hizmet arayan müşteriler ile güvenilir yerel ustaları aynı
              pazaryeri deneyiminde buluşturur. Hizmetini seç, profilleri karşılaştır ve doğrudan
              iletişime geç.
            </p>
          </div>

          <div className="grid gap-3 lg:justify-items-end">
            <p className="cursor-default select-none text-sm font-black uppercase text-white">
              Sosyal bağlantılar
            </p>
            <div className="flex flex-wrap gap-2.5">
              {socialLinks.map((item) => (
                <a
                  className="inline-flex min-h-10 cursor-pointer select-none items-center gap-2.5 rounded-md border border-white/18 bg-white/8 px-3.5 text-xs font-black text-white transition-colors hover:border-[rgba(255,138,0,0.72)] hover:bg-white/14 focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2 focus:ring-offset-[var(--brand-navy)]"
                  href={item.href}
                  key={item.label}
                  rel={item.external ? "noopener noreferrer" : undefined}
                  target={item.external ? "_blank" : undefined}
                >
                  <span className="pointer-events-none inline-flex size-7 shrink-0 select-none items-center justify-center rounded bg-[var(--brand-orange)] text-white">
                    <item.Icon aria-hidden="true" className="size-4" />
                  </span>
                  <span className="pointer-events-none select-none leading-none">{item.label}</span>
                </a>
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
            <address className="grid gap-2.5 not-italic">
              {contactLinks.map((item) => (
                <FooterAnchor item={item} key={item.label} />
              ))}
              <p className="inline-flex max-w-full cursor-default select-none items-center gap-2 text-sm font-semibold leading-6 text-white/82">
                <span className="inline-flex size-7 shrink-0 items-center justify-center rounded bg-white/10 text-[var(--brand-orange)]">
                  <MapPin aria-hidden="true" className="size-4" />
                </span>
                <span>İstanbul, Türkiye</span>
              </p>
            </address>
          </FooterColumn>

          <FooterColumn title="Web deneyimi">
            <div className="grid gap-4">
              <p className="cursor-default select-none text-sm font-semibold leading-7 text-white/78">
                Fuwu web sitesi masaüstü, tablet ve mobil tarayıcılarda usta arama ve doğrudan
                iletişim akışını rahatça kullanman için hazırlanır.
              </p>
              <Link
                className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-md bg-[var(--brand-orange)] px-4 text-center text-sm font-black text-white shadow-[0_14px_30px_rgba(255,138,0,0.18)] transition-colors hover:bg-[var(--brand-orange-dark)] sm:w-fit"
                href="/providers"
              >
                Ustaları İncele
              </Link>
            </div>
          </FooterColumn>
        </div>

        <div className="mb-8 grid gap-5 rounded-lg border border-white/14 bg-white/8 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-6">
          <div className="cursor-default select-none">
            <h2 className="text-2xl font-black leading-tight text-white">
              Yardıma mı ihtiyacın var?
            </h2>
            <p className="mt-2 text-sm font-semibold leading-7 text-white/78">
              Fuwu hakkında soruların için bize e-posta gönderebilirsin.
            </p>
          </div>
          <a
            className="inline-flex min-h-11 w-full cursor-pointer select-none items-center justify-center gap-2.5 rounded-md bg-[var(--brand-orange)] px-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(255,138,0,0.18)] transition-colors hover:bg-[var(--brand-orange-dark)] sm:w-fit"
            href="mailto:fuwuhizmet@gmail.com"
          >
            <Mail aria-hidden="true" className="size-4 shrink-0" />
            <span className="pointer-events-none select-none">E-posta Gönder</span>
          </a>
        </div>

        <div
          className="rounded-lg border border-white/14 bg-white/8 p-4 text-sm font-semibold leading-6 text-white/82"
          id="privacy"
        >
          <p className="cursor-default select-none">
            Gizlilik talepleri ve veri işleme soruları için Fuwu ekibine{" "}
            <a
              className="cursor-pointer select-none font-black text-white underline decoration-[var(--brand-orange)] decoration-2 underline-offset-4"
              href="mailto:fuwuhizmet@gmail.com"
            >
              fuwuhizmet@gmail.com
            </a>{" "}
            üzerinden ulaşabilirsiniz.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-white/14 pt-6 text-sm font-bold text-white/72 sm:flex-row sm:items-center sm:justify-between">
          <p className="cursor-default select-none">© 2026 Fuwu Hizmet</p>
          <p className="cursor-default select-none">Ustaya ulaşmanın en hızlı yolu.</p>
        </div>
      </Container>
    </footer>
  );
}
