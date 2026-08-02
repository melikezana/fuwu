import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  Check,
  CreditCard,
  KeyRound,
  SearchCheck,
  ShieldCheck,
  UserRoundPlus,
} from "lucide-react";
import type { ReactNode } from "react";
import { CustomerCharacterVisual } from "@/components/home/CustomerCharacterVisual";
import { HomeAssetImage } from "@/components/home/HomeAssetImage";
import { ProviderCharacterVisual } from "@/components/home/ProviderCharacterVisual";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { appRoutes } from "@/lib/constants/navigation";
import { homeAssets } from "@/lib/home-assets";
import { cn } from "@/lib/utils";

type HomePremiumPanelsProps = {
  activeProviderCount: number;
  averageRatingLabel: string | null;
  completedRequestCount: number;
  districtCount: number;
  serviceCategoryCount: number;
  source: "fallback" | "supabase";
};

type StatItem = {
  icon: LucideIcon;
  label: string;
  value: string;
};

const howSteps = [
  {
    asset: homeAssets.steps.selectService,
    description: "Hangi hizmete ihtiyacın olduğunu seç.",
    title: "İhtiyacını Seç",
  },
  {
    asset: homeAssets.steps.compareProviders,
    description: "Fiyat, yorum ve puanlara göre karşılaştır.",
    title: "Ustaları Karşılaştır",
  },
  {
    asset: homeAssets.steps.confirmService,
    description: "Doğru ustayı seç, hizmetini al.",
    title: "Güvenle Karar Ver",
  },
] as const;

const trustItems = [
  "Kimlik ve belge doğrulama",
  "Gerçek kullanıcı yorumları",
  "Hizmet sonrası destek",
  "Şeffaf fiyatlandırma",
  "Güvenli ödeme takibi",
];

const providerActions = [
  "Yeni müşteri kazan",
  "Profilini öne çıkar",
  "Kazancını artır",
  "Esnek çalışma",
];

const customerActions = [
  "Hızlıca usta bul",
  "Fiyatları karşılaştır",
  "Yorumları oku",
  "Kolayca iletişime geç",
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 0,
  }).format(value);
}

function BulletList({
  className,
  compact = false,
  items,
}: {
  className?: string;
  compact?: boolean;
  items: readonly string[];
}) {
  return (
    <ul className={cn("mt-4 grid min-w-0 gap-2", compact ? "gap-1.5" : "", className)}>
      {items.map((item) => (
        <li
          className={cn(
            "flex min-w-0 items-start gap-2 font-semibold text-[var(--brand-navy)] [overflow-wrap:anywhere]",
            compact ? "text-[0.78rem] leading-5" : "text-sm leading-5",
          )}
          key={item}
        >
          <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[var(--brand-navy)]" />
          <span className="min-w-0 [overflow-wrap:anywhere]">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function ActionPanel({
  buttonClassName,
  children,
  ctaLabel,
  description,
  href,
  items,
  title,
}: {
  buttonClassName?: string;
  children: ReactNode;
  ctaLabel: string;
  description: string;
  href: string;
  items: readonly string[];
  title: string;
}) {
  return (
    <article className="premium-home-panel grid min-h-[270px] min-w-0 overflow-hidden p-5 sm:grid-cols-[minmax(0,1fr)_minmax(180px,0.9fr)] sm:p-6">
      <div className="relative z-20 flex min-w-0 flex-col">
        <h2 className="min-w-0 text-[clamp(1.18rem,1rem+0.7vw,1.42rem)] font-extrabold leading-tight text-[var(--brand-navy)] [overflow-wrap:anywhere] [text-wrap:balance]">
          {title}
        </h2>
        <p className="mt-2 min-w-0 text-sm font-semibold leading-5 text-[var(--muted)] [overflow-wrap:anywhere]">
          {description}
        </p>
        <BulletList compact items={items} />
        <Button
          className={cn(
            "relative z-10 mt-auto min-h-11 w-full rounded-md px-5 text-center sm:w-fit",
            buttonClassName,
          )}
          href={href}
        >
          {ctaLabel}
        </Button>
      </div>
      <div className="relative -mb-6 mt-4 min-h-[13.5rem] min-w-0 sm:-mb-8 sm:mt-0 sm:h-[calc(100%+2rem)]">
        {children}
      </div>
    </article>
  );
}

function createStats({
  activeProviderCount,
  averageRatingLabel,
  completedRequestCount,
  districtCount,
  serviceCategoryCount,
  source,
}: HomePremiumPanelsProps): StatItem[] {
  const hasLiveMetrics = source === "supabase";

  return [
    {
      icon: UserRoundPlus,
      label: "Güvenilir Usta",
      value:
        hasLiveMetrics && activeProviderCount > 0
          ? formatNumber(activeProviderCount)
          : "Büyüyen usta ağı",
    },
    {
      icon: SearchCheck,
      label: "Tamamlanan Hizmet",
      value:
        hasLiveMetrics && completedRequestCount > 0
          ? formatNumber(completedRequestCount)
          : "Takip ediliyor",
    },
    {
      icon: BadgeCheck,
      label: "Ortalama Puan",
      value: averageRatingLabel ?? "Yorumlar geldikçe",
    },
    {
      icon: ShieldCheck,
      label: "Hizmet Ağımız",
      value: hasLiveMetrics && districtCount > 0 ? formatNumber(districtCount) : "İstanbul genelinde",
    },
    {
      icon: KeyRound,
      label: "Kategori",
      value: hasLiveMetrics && serviceCategoryCount > 0 ? formatNumber(serviceCategoryCount) : "Aktif katalog",
    },
    {
      icon: CreditCard,
      label: "Ödeme",
      value: "Manuel onay takibi",
    },
  ];
}

export function HomePremiumPanels(props: HomePremiumPanelsProps) {
  const stats = createStats(props);

  return (
    <section className="bg-[#FFFDF9] pb-12 sm:pb-14">
      <Container className="max-w-[1440px]">
        <div className="grid auto-rows-fr gap-4 lg:grid-cols-2 min-[1360px]:grid-cols-[1.05fr_1.05fr_1.12fr_1.12fr]">
          <article className="premium-home-panel min-h-[270px] min-w-0 p-5 sm:p-6">
            <h2 className="min-w-0 text-[clamp(1.18rem,1rem+0.7vw,1.42rem)] font-extrabold leading-tight text-[var(--brand-navy)] [overflow-wrap:anywhere] [text-wrap:balance]">
              Nasıl Çalışır?
            </h2>
            <p className="mt-1 min-w-0 text-sm font-semibold leading-5 text-[var(--muted)] [overflow-wrap:anywhere]">
              3 adımda hızlı ve güvenli hizmet
            </p>
            <div className="mt-4 grid min-w-0 grid-cols-3 gap-2">
              {howSteps.map((step, index) => (
                <div className="relative flex min-w-0 flex-col items-center text-center" key={step.title}>
                  <span className="absolute right-1 top-0 z-20 grid size-6 place-items-center rounded-full bg-white text-xs font-extrabold text-[var(--brand-orange)] shadow-[0_8px_20px_rgba(255,101,0,0.2)] ring-1 ring-[rgba(255,101,0,0.22)]">
                    {index + 1}
                  </span>
                  <HomeAssetImage
                    alt={`${step.title} adim gorseli`}
                    className="h-[5.85rem] w-full max-w-[6.7rem] rounded-md"
                    height={512}
                    imageClassName="object-contain object-center"
                    sizes="(min-width: 1360px) 105px, (min-width: 640px) 28vw, 30vw"
                    src={step.asset}
                    width={512}
                  />
                  <h3 className="mt-2 min-w-0 text-[clamp(0.68rem,0.62rem+0.24vw,0.8rem)] font-extrabold leading-5 text-[var(--brand-navy)] [overflow-wrap:anywhere] [text-wrap:balance]">
                    {step.title}
                  </h3>
                  <p className="mt-1 min-w-0 text-[clamp(0.66rem,0.6rem+0.18vw,0.74rem)] font-semibold leading-5 text-[var(--muted)] [overflow-wrap:anywhere]">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="premium-home-panel grid min-h-[270px] min-w-0 gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_minmax(8.5rem,0.72fr)] sm:p-6">
            <div className="relative z-10 min-w-0">
              <h2 className="min-w-0 text-[clamp(1.18rem,1rem+0.7vw,1.42rem)] font-extrabold leading-tight text-[var(--brand-navy)] [overflow-wrap:anywhere] [text-wrap:balance]">
                Güven Sistemi
              </h2>
              <p className="mt-1 min-w-0 text-sm font-semibold leading-5 text-[var(--muted)] [overflow-wrap:anywhere]">
                İçin rahat olsun diye buradayız
              </p>
              <BulletList compact items={trustItems} />
            </div>
            <HomeAssetImage
              alt="Fuwu guven sistemi kalkan gorseli"
              className="relative min-h-[10rem] min-w-0 self-end rounded-md sm:h-full"
              height={512}
              imageClassName="object-contain object-bottom"
              sizes="(min-width: 1360px) 150px, (min-width: 640px) 28vw, 70vw"
              src={homeAssets.trust.securityShield}
              width={512}
            />
          </article>

          <ActionPanel
            ctaLabel="Hemen Usta Ol"
            description="İşini büyüt, daha fazla müşteriye ulaş."
            href={appRoutes.providerApplication}
            items={providerActions}
            title="Usta Ol"
          >
            <ProviderCharacterVisual className="h-full min-h-[13.5rem] object-bottom" />
          </ActionPanel>

          <ActionPanel
            buttonClassName="bg-[var(--brand-navy)] shadow-[0_18px_42px_rgba(10,37,64,0.18)] hover:bg-[var(--brand-navy)]"
            ctaLabel="Usta Bul"
            description="Güvenilir ustaları keşfet, işini kolaylaştır."
            href={appRoutes.providers}
            items={customerActions}
            title="Usta Bul"
          >
            <CustomerCharacterVisual className="h-full min-h-[13.5rem] object-bottom" />
          </ActionPanel>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(28rem,0.72fr)]">
          <div className="grid min-h-[9.5rem] overflow-hidden rounded-lg border border-[rgba(10,37,64,0.08)] bg-white shadow-[0_22px_60px_rgba(10,37,64,0.10)] sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {stats.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  className="flex min-w-0 items-center gap-2 border-b border-[var(--border)] px-3 py-4 last:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0"
                  key={item.label}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[#FFFDF9] text-[var(--brand-orange)] ring-1 ring-[rgba(255,101,0,0.14)]">
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block min-w-0 text-[0.8rem] font-extrabold leading-5 text-[var(--brand-navy)] [overflow-wrap:anywhere]">
                      {item.value}
                    </span>
                    <span className="mt-1 block min-w-0 text-[0.68rem] font-semibold leading-4 text-[var(--muted)] [overflow-wrap:anywhere]">
                      {item.label}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>

          <article className="premium-home-panel grid min-h-[9.75rem] min-w-0 gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.72fr)] sm:p-6">
            <div className="relative z-10 min-w-0 max-w-md">
              <h2 className="min-w-0 text-[clamp(1.18rem,1rem+0.7vw,1.42rem)] font-extrabold leading-tight text-[var(--brand-navy)] [overflow-wrap:anywhere] [text-wrap:balance]">
                Güvenli Ödeme Altyapısı
              </h2>
              <p className="mt-2 min-w-0 text-sm font-semibold leading-5 text-[var(--muted)] [overflow-wrap:anywhere]">
                Nakit ve IBAN/Havale tercihleri ödeme takip kaydına bağlanır.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {["Nakit", "IBAN / Havale"].map((label) => (
                  <span
                    className="inline-flex min-h-10 min-w-0 items-center justify-center rounded-md border border-[rgba(10,37,64,0.08)] bg-white px-3 py-2 text-center text-[0.72rem] font-extrabold leading-4 text-[var(--brand-navy)] shadow-[0_14px_34px_rgba(10,37,64,0.09)] [overflow-wrap:anywhere]"
                    key={label}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <HomeAssetImage
              alt="Fuwu odeme kilitli kart gorseli"
              className="relative min-h-[9rem] min-w-0 self-end rounded-md sm:h-full"
              height={512}
              imageClassName="object-contain object-center"
              sizes="(min-width: 1024px) 230px, 72vw"
              src={homeAssets.payment.lockCard}
              width={512}
            />
          </article>
        </div>
      </Container>
    </section>
  );
}
