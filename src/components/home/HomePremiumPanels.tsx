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

const panelTitleClassName =
  "min-w-0 max-w-full text-[1.5rem] font-extrabold leading-[1.12] text-[var(--brand-navy)] md:text-[1.75rem] [text-wrap:balance]";
const actionTitleClassName =
  "premium-action-title";
const panelCopyClassName =
  "mt-2 min-w-0 max-w-[34ch] text-[0.95rem] font-semibold leading-[1.55] text-[var(--muted)] [text-wrap:pretty]";

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
    <ul className={cn("mt-4 grid min-w-0 gap-2.5", compact ? "gap-2" : "", className)}>
      {items.map((item) => (
        <li
          className={cn(
            "flex min-w-0 items-start gap-2.5 font-semibold text-[var(--brand-navy)] [hyphens:none] [overflow-wrap:normal] [word-break:normal]",
            compact ? "text-[0.94rem] leading-[1.45]" : "text-[0.98rem] leading-[1.5]",
          )}
          key={item}
        >
          <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-[var(--brand-navy)]" />
          <span className="min-w-0 [hyphens:none] [overflow-wrap:normal] [word-break:normal]">
            {item}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ActionBulletList({ items }: { items: readonly string[] }) {
  return (
    <ul className="premium-action-list">
      {items.map((item) => (
        <li className="premium-action-list-item" key={item}>
          <Check aria-hidden="true" className="premium-action-check" />
          <span>{item}</span>
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
    <article className="premium-home-panel premium-action-panel">
      <div className="premium-action-content">
        <h2 className={actionTitleClassName}>{title}</h2>
        <p className="premium-action-description">
          {description}
        </p>
        <ActionBulletList items={items} />
      </div>
      <div className="premium-character-stage">
        {children}
      </div>
      <Button
        className={cn(
          "premium-action-cta",
          buttonClassName,
        )}
        href={href}
      >
        {ctaLabel}
      </Button>
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
    <section className="bg-[#FFFDF9] pb-14 pt-4 sm:pb-16">
      <Container className="max-w-[1440px]">
        <div className="grid gap-4 lg:grid-cols-2 xl:gap-5">
          <article className="premium-home-panel min-h-[280px] min-w-0 p-5 sm:p-6">
            <h2 className={panelTitleClassName}>
              Nasıl Çalışır?
            </h2>
            <p className={panelCopyClassName}>
              3 adımda hızlı ve güvenli hizmet
            </p>
            <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-3 sm:gap-2.5">
              {howSteps.map((step, index) => (
                <div
                  className="relative grid min-w-0 grid-cols-[4.75rem_minmax(0,1fr)] items-center gap-3 text-left sm:flex sm:flex-col sm:items-center sm:text-center"
                  key={step.title}
                >
                  <span className="absolute left-12 top-0 z-20 grid size-6 place-items-center rounded-full bg-white text-xs font-extrabold text-[var(--brand-orange)] shadow-[0_8px_20px_rgba(255,101,0,0.2)] ring-1 ring-[rgba(255,101,0,0.22)] sm:left-auto sm:right-1">
                    {index + 1}
                  </span>
                  <HomeAssetImage
                    alt={`${step.title} adim gorseli`}
                    className="h-[4.6rem] w-full max-w-[4.8rem] rounded-md sm:h-[5.85rem] sm:max-w-[6.7rem]"
                    height={512}
                    imageClassName="object-contain object-center"
                    sizes="(min-width: 1360px) 105px, (min-width: 640px) 28vw, 30vw"
                    src={step.asset}
                    width={512}
                  />
                  <div className="min-w-0">
                    <h3 className="min-w-0 text-sm font-extrabold leading-5 text-[var(--brand-navy)] [text-wrap:balance]">
                      {step.title}
                    </h3>
                    <p className="mt-1 min-w-0 text-[0.82rem] font-semibold leading-5 text-[var(--muted)] [text-wrap:pretty]">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="premium-home-panel grid min-h-[280px] min-w-0 gap-4 p-5 sm:p-6 md:grid-cols-[minmax(0,1fr)_minmax(180px,0.72fr)] md:items-end">
            <div className="relative z-10 min-w-0">
              <h2 className={panelTitleClassName}>
                Güven Sistemi
              </h2>
              <p className={panelCopyClassName}>
                İçin rahat olsun diye buradayız
              </p>
              <BulletList compact items={trustItems} />
            </div>
            <HomeAssetImage
              alt="Fuwu guven sistemi kalkan gorseli"
              className="relative h-[180px] min-w-0 self-end rounded-md md:h-full"
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
            <ProviderCharacterVisual />
          </ActionPanel>

          <ActionPanel
            buttonClassName="bg-[var(--brand-navy)] shadow-[0_18px_42px_rgba(10,37,64,0.18)] hover:bg-[var(--brand-navy)]"
            ctaLabel="Usta Bul"
            description="Güvenilir ustaları keşfet, işini kolaylaştır."
            href={appRoutes.providers}
            items={customerActions}
            title="Usta Bul"
          >
            <CustomerCharacterVisual />
          </ActionPanel>
        </div>

        <div className="mt-6 grid gap-5">
          <div className="home-stats-grid grid min-h-[160px] grid-cols-2 overflow-hidden rounded-lg border border-[rgba(10,37,64,0.08)] bg-white shadow-[0_22px_60px_rgba(10,37,64,0.10)] md:grid-cols-3 xl:grid-cols-6">
            {stats.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  className="home-stat-cell flex min-w-0 flex-col justify-center gap-3 p-5 sm:p-6 xl:p-5"
                  key={item.label}
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-md bg-[#FFFDF9] text-[var(--brand-orange)] ring-1 ring-[rgba(255,101,0,0.14)]">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block min-w-0 text-[1.05rem] font-extrabold leading-[1.3] text-[var(--brand-navy)] sm:text-[1.15rem] xl:text-[1.25rem] [hyphens:none] [overflow-wrap:normal] [text-wrap:balance] [word-break:normal]">
                      {item.value}
                    </span>
                    <span className="mt-1.5 block min-w-0 max-w-[16ch] text-[0.84rem] font-semibold leading-[1.4] text-[var(--muted)] [hyphens:none] [overflow-wrap:normal] [text-wrap:balance] [word-break:normal]">
                      {item.label}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>

          <article className="premium-home-panel grid min-h-[220px] min-w-0 gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.48fr)] lg:items-center">
            <div className="relative z-10 min-w-0">
              <h2 className="min-w-0 max-w-[18ch] text-[1.5rem] font-extrabold leading-[1.12] text-[var(--brand-navy)] md:text-[1.75rem] xl:text-[2rem] [text-wrap:balance]">
                Güvenli Ödeme Altyapısı
              </h2>
              <p className="mt-3 min-w-0 max-w-[36ch] text-[0.98rem] font-semibold leading-[1.5] text-[var(--muted)] [text-wrap:pretty]">
                Nakit ve IBAN/Havale tercihleri ödeme takip kaydına bağlanır.
              </p>
              <div className="mt-5 grid max-w-[24rem] grid-cols-1 gap-2 min-[380px]:grid-cols-2">
                {["Nakit", "IBAN / Havale"].map((label) => (
                  <span
                    className="inline-flex min-h-12 min-w-0 items-center justify-center whitespace-nowrap rounded-md border border-[rgba(10,37,64,0.08)] bg-white px-4 py-2.5 text-center text-sm font-extrabold leading-5 text-[var(--brand-navy)] shadow-[0_14px_34px_rgba(10,37,64,0.09)]"
                    key={label}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <HomeAssetImage
              alt="Fuwu odeme kilitli kart gorseli"
              className="relative h-[180px] min-w-0 self-end rounded-md sm:h-[220px] lg:h-[240px]"
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
