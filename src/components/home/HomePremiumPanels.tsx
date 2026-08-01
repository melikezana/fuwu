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
import { HomeAssetVisual } from "@/components/home/HomeAssetVisual";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { ThreeDIcon } from "@/components/ui/ThreeDIcon";
import { appRoutes } from "@/lib/constants/navigation";
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
    description: "Hangi hizmete ihtiyacın olduğunu seç.",
    iconName: "paint-roller",
    title: "İhtiyacını Seç",
  },
  {
    description: "Fiyat, yorum ve puanlara göre karşılaştır.",
    iconName: "faucet",
    title: "Ustaları Karşılaştır",
  },
  {
    description: "Doğru ustayı seç, hizmetini al.",
    iconName: "home",
    title: "Güvenle Karar Ver",
  },
] as const;

const trustItems = [
  "Kimlik ve belge doğrulama",
  "Gerçek kullanıcı yorumları",
  "Hizmet sonrası destek",
  "Şeffaf fiyatlandırma",
  "Güvenli ödeme altyapısı",
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

function PersonIllustration({
  className,
  tone,
}: {
  className?: string;
  tone: "customer" | "provider";
}) {
  return (
    <HomeAssetVisual
      className={cn("h-full min-h-[11.5rem] w-full", className)}
      imageClassName="object-contain object-bottom"
      sizes="(min-width: 1280px) 170px, (min-width: 640px) 42vw, 72vw"
      src={
        tone === "provider"
          ? "/assets/home/provider-character.webp"
          : "/assets/home/customer-character.webp"
      }
      variant={tone === "provider" ? "provider-character" : "customer-character"}
    />
  );
}

function LockPaymentIllustration({ className }: { className?: string }) {
  return (
    <HomeAssetVisual
      className={cn("h-full min-h-[8.5rem] w-full", className)}
      imageClassName="object-contain object-right"
      sizes="(min-width: 1024px) 260px, 70vw"
      src="/assets/home/payment-lock-card.webp"
      variant="payment-lock-card"
    />
  );
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
    <ul className={cn("mt-4 grid gap-2", compact ? "gap-1.5" : "", className)}>
      {items.map((item) => (
        <li
          className={cn(
            "flex min-w-0 items-start gap-2 font-semibold text-[var(--brand-navy)]",
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
        <div className="grid auto-rows-fr gap-4 lg:grid-cols-[1.05fr_1.05fr_1.1fr_1.1fr]">
          <article className="premium-home-panel min-h-[16.5rem] p-5 sm:p-6">
            <h2 className="text-[1.35rem] font-extrabold leading-tight text-[var(--brand-navy)]">
              Nasıl Çalışır?
            </h2>
            <p className="mt-1 text-sm font-semibold leading-5 text-[var(--muted)]">
              3 adımda hızlı ve güvenli hizmet
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3 lg:gap-3">
              {howSteps.map((step, index) => (
                <div className="relative flex min-w-0 flex-col items-center text-center" key={step.title}>
                  {index < howSteps.length - 1 ? (
                    <span className="absolute left-[calc(50%+2.1rem)] top-6 hidden w-[calc(100%-4.2rem)] border-t border-dashed border-[rgba(10,37,64,0.18)] sm:block" />
                  ) : null}
                  <div className="relative">
                    <span className="absolute -right-2 -top-1 z-20 grid size-6 place-items-center rounded-full bg-white text-xs font-extrabold text-[var(--brand-orange)] shadow-[0_8px_20px_rgba(255,101,0,0.2)] ring-1 ring-[rgba(255,101,0,0.22)]">
                      {index + 1}
                    </span>
                    <ThreeDIcon accent="var(--brand-orange)" name={step.iconName} size="sm" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[0.78rem] font-extrabold leading-5 text-[var(--brand-navy)]">
                      {step.title}
                    </h3>
                    <p className="mt-1 text-[0.72rem] font-semibold leading-5 text-[var(--muted)] [overflow-wrap:anywhere]">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="premium-home-panel relative min-h-[16.5rem] p-5 sm:p-6">
            <h2 className="text-[1.35rem] font-extrabold leading-tight text-[var(--brand-navy)]">
              Güven Sistemi
            </h2>
            <p className="mt-1 text-sm font-semibold leading-5 text-[var(--muted)]">
              İçin rahat olsun diye buradayız
            </p>
            <BulletList className="max-w-full pr-0 sm:max-w-[62%]" compact items={trustItems} />
            <HomeAssetVisual
              className="absolute bottom-4 right-4 hidden h-[8.8rem] w-[9rem] sm:block"
              imageClassName="object-contain object-bottom"
              sizes="150px"
              src="/assets/home/security-lock.webp"
              variant="security-lock"
            />
          </article>

          <article className="premium-home-panel relative flex min-h-[16.5rem] flex-col p-5 sm:p-6">
            <h2 className="text-[1.35rem] font-extrabold leading-tight text-[var(--brand-navy)]">Usta Ol</h2>
            <p className="mt-2 max-w-full text-sm font-semibold leading-5 text-[var(--muted)] [overflow-wrap:anywhere] sm:max-w-[52%]">
              İşini büyüt, daha fazla müşteriye ulaş.
            </p>
            <BulletList className="max-w-full sm:max-w-[52%]" compact items={providerActions} />
            <Button className="relative z-10 mt-auto h-11 min-h-11 w-fit rounded-md px-5" href={appRoutes.providerApplication}>
              Hemen Usta Ol
            </Button>
            <PersonIllustration className="relative mt-4 h-44 w-full sm:absolute sm:bottom-0 sm:right-0 sm:mt-0 sm:h-[88%] sm:w-[48%]" tone="provider" />
          </article>

          <article className="premium-home-panel relative flex min-h-[16.5rem] flex-col p-5 sm:p-6">
            <h2 className="text-[1.35rem] font-extrabold leading-tight text-[var(--brand-navy)]">Usta Bul</h2>
            <p className="mt-2 max-w-full text-sm font-semibold leading-5 text-[var(--muted)] [overflow-wrap:anywhere] sm:max-w-[52%]">
              Güvenilir ustaları keşfet, işini kolaylaştır.
            </p>
            <BulletList className="max-w-full sm:max-w-[52%]" compact items={customerActions} />
            <Button
              className="relative z-10 mt-auto h-11 min-h-11 w-fit rounded-md bg-[var(--brand-navy)] px-5 shadow-[0_18px_42px_rgba(10,37,64,0.18)] hover:bg-[var(--brand-navy)]"
              href={appRoutes.providers}
            >
              Usta Bul
            </Button>
            <PersonIllustration className="relative mt-4 h-44 w-full sm:absolute sm:bottom-0 sm:right-0 sm:mt-0 sm:h-[88%] sm:w-[48%]" tone="customer" />
          </article>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(32rem,0.78fr)]">
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
                    <span className="block text-[0.8rem] font-extrabold leading-5 text-[var(--brand-navy)] [overflow-wrap:anywhere]">
                      {item.value}
                    </span>
                    <span className="mt-1 block text-[0.68rem] font-semibold leading-4 text-[var(--muted)] [overflow-wrap:anywhere]">
                      {item.label}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>

          <article className="premium-home-panel grid min-h-[9.5rem] min-w-0 gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_15rem] sm:p-6">
            <div className="relative z-10 min-w-0 max-w-md">
              <h2 className="text-[1.35rem] font-extrabold leading-tight text-[var(--brand-navy)]">
                Güvenli Ödeme Altyapısı
              </h2>
              <p className="mt-2 text-sm font-semibold leading-5 text-[var(--muted)] [overflow-wrap:anywhere]">
                Nakit, IBAN/Havale ve online ödeme yakında tercihleri ödeme takip kaydına bağlanır.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {["Nakit", "IBAN / Havale", "Online ödeme yakında"].map((label) => (
                  <span
                    className="inline-flex min-h-10 min-w-0 items-center justify-center rounded-md border border-[rgba(10,37,64,0.08)] bg-white px-3 py-2 text-center text-[0.68rem] font-extrabold leading-4 text-[var(--brand-navy)] shadow-[0_14px_34px_rgba(10,37,64,0.09)]"
                    key={label}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <LockPaymentIllustration className="relative min-h-[8.5rem] sm:min-h-full" />
          </article>
        </div>
      </Container>
    </section>
  );
}
