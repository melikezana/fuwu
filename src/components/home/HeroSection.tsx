import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { TextLink } from "@/components/ui/TextLink";
import { ServiceIcon } from "@/components/home/ServiceIcon";
import { appRoutes, ctaLabels } from "@/lib/constants/navigation";
import { services, type ServiceIconName } from "@/lib/constants/services";

type TrustSignal = {
  id: string;
  title: string;
  description: string;
  mark: string;
};

type HeroRequest = {
  id: string;
  title: string;
  meta: string;
  status: string;
  iconName: ServiceIconName;
};

const discoveryServices = services.slice(0, 5);
const heroCategoryPills = ["Temizlik", "Tamir", "Teknik servis", "Taşınma"];

const trustSignals: TrustSignal[] = [
  {
    id: "provider-checks",
    title: "Değerlendirilen ustalar",
    description: "Profil bilgileri net görünür",
    mark: "01",
  },
  {
    id: "fast-first-step",
    title: "Hızlı dönüş",
    description: "Ortalama dakikalar içinde yanıt",
    mark: "02",
  },
  {
    id: "no-payment-to-start",
    title: "Ödeme olmadan başla",
    description: "İlk adımda kart gerekmez",
    mark: "03",
  },
];

const heroRequests: HeroRequest[] = [
  {
    id: "cleaning",
    title: "Temizlik",
    meta: "Ev, ofis, taşınma sonrası",
    status: "Usta Bul",
    iconName: "sparkles",
  },
  {
    id: "plumbing",
    title: "Tesisat",
    meta: "Kaçak, musluk, gider",
    status: "Hızlı dönüş",
    iconName: "pipe",
  },
  {
    id: "moving-help",
    title: "Taşınma Desteği",
    meta: "Paketleme ve taşıma",
    status: "Planla",
    iconName: "truck",
  },
];

function HeroSearch() {
  return (
    <div className="mt-8 max-w-full rounded-lg border border-[rgba(255,138,0,0.24)] bg-white p-3 shadow-[var(--shadow-elevated)] sm:p-4">
      <form
        action={appRoutes.request}
        className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)_minmax(9rem,auto)]"
      >
        <label className="min-w-0 rounded-md border border-[var(--border)] bg-[var(--background)] px-4 py-3 focus-within:border-[var(--brand-orange)] focus-within:bg-white">
          <span className="block text-xs font-bold uppercase tracking-normal text-[var(--muted)]">
            Hizmet
          </span>
          <span className="mt-2 flex items-center gap-2 text-[var(--brand-navy)]">
            <span className="shrink-0 rounded-md bg-white px-2 py-1 text-[0.65rem] font-bold uppercase leading-none text-[var(--brand-orange-dark)] ring-1 ring-[var(--border)]">
              Talep
            </span>
            <input
              className="min-w-0 flex-1 bg-transparent text-base font-bold outline-none placeholder:text-[var(--muted)]"
              name="service"
              placeholder="Temizlik, tesisat, klima & beyaz eşya"
              type="search"
            />
          </span>
        </label>

        <label className="min-w-0 rounded-md border border-[var(--border)] bg-[var(--background)] px-4 py-3 focus-within:border-[var(--brand-orange)] focus-within:bg-white">
          <span className="block text-xs font-bold uppercase tracking-normal text-[var(--muted)]">
            Konum
          </span>
          <span className="mt-2 flex items-center gap-2 text-[var(--brand-navy)]">
            <span className="shrink-0 rounded-md bg-white px-2 py-1 text-[0.65rem] font-bold uppercase leading-none text-[var(--brand-orange-dark)] ring-1 ring-[var(--border)]">
              Bölge
            </span>
            <input
              className="min-w-0 flex-1 bg-transparent text-base font-bold outline-none placeholder:text-[var(--muted)]"
              name="location"
              placeholder="Yakınımda"
              type="text"
            />
          </span>
        </label>

        <Button className="min-h-[58px] w-full whitespace-nowrap px-6" type="submit">
          {ctaLabels.request}
        </Button>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="select-none text-sm font-bold text-[var(--muted)]">Hızlı başla:</span>
        {discoveryServices.map((service) => (
          <Link
            className="cursor-pointer select-none rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm font-bold text-[var(--brand-navy)] transition-colors hover:border-[var(--brand-orange)] hover:bg-[var(--brand-orange-soft)]"
            href={`${appRoutes.request}?service=${encodeURIComponent(service.title)}`}
            key={service.id}
          >
            {service.title}
          </Link>
        ))}
      </div>
    </div>
  );
}

function HeroVisual() {
  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-[rgba(255,138,0,0.22)] bg-white p-4 shadow-[var(--shadow-premium)] sm:p-5">
      <div className="relative flex items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-[var(--brand-orange-dark)]">Fuwu pazaryeri</p>
          <p className="mt-1 text-2xl font-bold leading-tight text-[var(--brand-navy)]">
            Usta bulma merkezi
          </p>
        </div>
        <span className="shrink-0 rounded-md bg-[var(--brand-orange-soft)] px-3 py-1 text-xs font-bold text-[var(--brand-orange-dark)]">
          Erken erişim
        </span>
      </div>

      <div className="relative mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          ["8", "hizmet"],
          ["3", "adım"],
          ["0", "ön ödeme"],
        ].map(([value, label]) => (
          <div className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-3" key={label}>
            <p className="text-xl font-bold leading-none text-[var(--brand-navy)]">{value}</p>
            <p className="mt-1 text-xs font-bold text-[var(--muted)]">{label}</p>
          </div>
        ))}
      </div>

      <div className="relative mt-3 divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-white">
        {heroRequests.map((item) => (
          <Link
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-4 transition-colors hover:bg-[var(--brand-orange-soft)] sm:gap-4"
            href={`${appRoutes.request}?service=${encodeURIComponent(item.title)}`}
            key={item.id}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)] ring-1 ring-[rgba(255,138,0,0.22)]">
              <ServiceIcon name={item.iconName} />
            </span>
            <span className="min-w-0">
              <span className="block font-bold leading-tight text-[var(--brand-navy)]">
                {item.title}
              </span>
              <span className="mt-1 block text-sm font-bold text-[var(--muted)]">
                {item.meta}
              </span>
            </span>
            <span className="hidden rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-1 text-right text-xs font-bold text-[var(--brand-navy)] sm:block">
              {item.status}
            </span>
          </Link>
        ))}
      </div>

      <div className="relative mt-4 rounded-lg bg-[var(--brand-navy)] p-4 text-white">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-bold text-[var(--brand-orange)]">Nasıl işler?</p>
          <p className="text-xs font-bold text-white/60">3 net adım</p>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {["Belirle", "Karşılaştır", "İletişime geç"].map((step, index) => (
            <div className="rounded-md bg-white/[0.08] px-2 py-3" key={step}>
              <p className="mx-auto flex h-7 w-7 items-center justify-center rounded-md bg-[var(--brand-orange)] text-sm font-bold text-[var(--brand-navy)]">
                {index + 1}
              </p>
              <p className="mt-2 text-xs font-bold text-white/80">{step}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="overflow-hidden border-b border-[var(--border)] bg-[linear-gradient(180deg,#fff8ef_0%,var(--background)_52%,#ffffff_100%)]">
      <Container className="grid gap-8 py-10 sm:gap-10 sm:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.86fr)] lg:items-center lg:gap-10 lg:py-14 xl:gap-14">
        <div className="min-w-0">
          <p className="text-sm font-bold uppercase tracking-normal text-[var(--brand-orange-dark)]">
            İstanbul genelinde yerel hizmet
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight tracking-normal text-[var(--brand-navy)] sm:text-5xl lg:text-6xl">
            Ustaya ulaşmanın en hızlı yolu.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg sm:leading-8">
            İhtiyacını belirle, ustaları karşılaştır, ortalama fiyat aralıklarını gör ve telefon ya da
            WhatsApp ile anında iletişime geç.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {heroCategoryPills.map((item) => (
              <span
                className="cursor-default select-none rounded-md border border-[rgba(255,138,0,0.26)] bg-white px-3 py-2 text-sm font-bold text-[var(--brand-navy)] shadow-[var(--shadow-subtle)]"
                key={item}
              >
                {item}
              </span>
            ))}
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button className="w-full sm:w-fit sm:px-6" href={appRoutes.request}>
              {ctaLabels.request}
            </Button>
            <Button
              className="w-full sm:w-fit"
              href={appRoutes.providerApplication}
              variant="secondary"
            >
              {ctaLabels.provider}
            </Button>
          </div>
          <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
            Daha özel bir ihtiyacın mı var?{" "}
            <TextLink
              className="font-semibold"
              href={appRoutes.request}
            >
              {ctaLabels.request}
            </TextLink>
            .
          </p>

          <HeroSearch />

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {trustSignals.map((signal) => (
              <div
                className="grid cursor-default select-none grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-lg border border-[var(--border)] bg-white px-4 py-3"
                key={signal.id}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--brand-orange-soft)] text-[0.68rem] font-bold text-[var(--brand-orange-dark)]">
                  {signal.mark}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold leading-tight text-[var(--brand-navy)]">
                    {signal.title}
                  </span>
                  <span className="mt-1 block text-xs font-bold leading-5 text-[var(--muted)]">
                    {signal.description}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0 lg:max-w-[440px] lg:justify-self-end xl:max-w-[480px]">
          <HeroVisual />
        </div>
      </Container>
    </section>
  );
}
