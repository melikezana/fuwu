import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  Check,
  CreditCard,
  KeyRound,
  LockKeyhole,
  SearchCheck,
  ShieldCheck,
  Smartphone,
  UserRoundPlus,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { ThreeDIcon } from "@/components/ui/ThreeDIcon";
import { appRoutes } from "@/lib/constants/navigation";

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

function PersonIllustration({ tone }: { tone: "customer" | "provider" }) {
  const isProvider = tone === "provider";

  return (
    <div
      aria-hidden="true"
      className="absolute bottom-0 right-2 hidden h-48 w-36 overflow-visible sm:block"
    >
      <span
        className="absolute left-9 top-3 size-16 rounded-full border border-[rgba(10,37,64,0.08)] bg-[#F3B38A] shadow-[var(--shadow-card)]"
      />
      {isProvider ? (
        <span className="absolute left-6 top-0 h-8 w-[5.5rem] rounded-b-md rounded-t-[28px] bg-[var(--brand-navy)] shadow-[var(--shadow-subtle)]" />
      ) : (
        <span className="absolute left-4 top-0 h-24 w-28 rounded-t-[44px] bg-[#3B241A]" />
      )}
      <span
        className={isProvider
          ? "absolute bottom-0 left-5 h-28 w-24 rounded-t-[28px] bg-[var(--brand-navy)] shadow-[var(--shadow-elevated)]"
          : "absolute bottom-0 left-5 h-28 w-24 rounded-t-[34px] bg-[var(--brand-orange)] shadow-[var(--shadow-elevated)]"}
      />
      <span className="absolute bottom-10 left-2 h-12 w-5 -rotate-12 rounded-full bg-[#F3B38A]" />
      <span className="absolute bottom-10 right-3 h-12 w-5 rotate-12 rounded-full bg-[#F3B38A]" />
      <span className="absolute bottom-16 right-0 grid h-16 w-10 rotate-[-10deg] place-items-center rounded-md bg-[var(--brand-navy-deep)] text-white shadow-[var(--shadow-card)]">
        <Smartphone className="size-5" />
      </span>
      {isProvider ? (
        <span className="absolute bottom-16 left-7 h-4 w-16 rounded-full bg-[var(--brand-orange)]" />
      ) : null}
    </div>
  );
}

function LockPaymentIllustration() {
  return (
    <div aria-hidden="true" className="relative hidden min-h-32 sm:block">
      <span className="absolute right-20 top-11 h-20 w-36 rotate-[-4deg] rounded-lg bg-[linear-gradient(135deg,#eaf0f7,#ffffff)] shadow-[var(--shadow-card)] ring-1 ring-[rgba(10,37,64,0.08)]" />
      <span className="absolute right-10 top-16 h-16 w-28 rotate-[8deg] rounded-lg bg-[var(--brand-navy)] shadow-[var(--shadow-elevated)]" />
      <span className="absolute right-28 top-2 grid size-24 place-items-center rounded-lg bg-white shadow-[var(--shadow-elevated)] ring-1 ring-[rgba(10,37,64,0.08)]">
        <span className="absolute top-5 h-9 w-12 rounded-t-full border-[7px] border-[#cbd5e1] border-b-0" />
        <span className="grid size-14 translate-y-4 place-items-center rounded-md bg-[var(--brand-orange-soft)] text-[var(--brand-orange)]">
          <LockKeyhole className="size-7" />
        </span>
      </span>
    </div>
  );
}

function BulletList({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-4 grid gap-2">
      {items.map((item) => (
        <li className="flex items-start gap-2 text-sm font-semibold leading-5 text-[var(--brand-navy)]" key={item}>
          <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[var(--brand-navy)]" />
          <span>{item}</span>
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
    <section className="bg-white pb-10">
      <Container className="max-w-[1390px]">
        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr_0.95fr_0.95fr]">
          <article className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-subtle)]">
            <h2 className="text-2xl font-extrabold leading-tight text-[var(--brand-navy)]">
              Nasıl Çalışır?
            </h2>
            <p className="mt-1 text-sm font-semibold leading-5 text-[var(--muted)]">
              3 adımda hızlı ve güvenli hizmet
            </p>
            <div className="mt-5 grid gap-3">
              {howSteps.map((step, index) => (
                <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-3" key={step.title}>
                  <div className="relative">
                    <span className="absolute -right-2 top-0 grid size-6 place-items-center rounded-full bg-[var(--brand-orange-soft)] text-xs font-extrabold text-[var(--brand-orange-dark)]">
                      {index + 1}
                    </span>
                    <ThreeDIcon accent="var(--brand-orange)" name={step.iconName} size="sm" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-extrabold leading-5 text-[var(--brand-navy)]">
                      {step.title}
                    </h3>
                    <p className="mt-1 text-xs font-semibold leading-5 text-[var(--muted)]">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="relative overflow-hidden rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-subtle)]">
            <h2 className="text-2xl font-extrabold leading-tight text-[var(--brand-navy)]">
              Güven Sistemi
            </h2>
            <p className="mt-1 text-sm font-semibold leading-5 text-[var(--muted)]">
              İçin rahat olsun diye buradayız
            </p>
            <BulletList items={trustItems} />
            <div className="absolute bottom-3 right-3 hidden size-20 place-items-center rounded-lg bg-[linear-gradient(145deg,#ffffff,#eaf0f7)] text-[var(--brand-navy)] shadow-[var(--shadow-card)] ring-1 ring-[rgba(10,37,64,0.08)] sm:grid">
              <ShieldCheck className="size-10" />
              <span className="absolute -bottom-2 -right-2 grid size-9 place-items-center rounded-full bg-[var(--trust-green)] text-white ring-4 ring-white">
                <Check className="size-5" />
              </span>
            </div>
          </article>

          <article className="relative min-h-[17rem] overflow-hidden rounded-lg border border-[var(--border)] bg-[linear-gradient(180deg,#ffffff_0%,#fffaf5_100%)] p-5 shadow-[var(--shadow-subtle)]">
            <h2 className="text-2xl font-extrabold leading-tight text-[var(--brand-navy)]">Usta Ol</h2>
            <p className="mt-2 max-w-[13rem] text-sm font-semibold leading-5 text-[var(--muted)]">
              İşini büyüt, daha fazla müşteriye ulaş.
            </p>
            <BulletList items={providerActions} />
            <Button className="relative z-10 mt-5 h-11 min-h-11 rounded-md px-4" href={appRoutes.providerApplication}>
              Hemen Usta Ol
            </Button>
            <PersonIllustration tone="provider" />
          </article>

          <article className="relative min-h-[17rem] overflow-hidden rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-subtle)]">
            <h2 className="text-2xl font-extrabold leading-tight text-[var(--brand-navy)]">Usta Bul</h2>
            <p className="mt-2 max-w-[13rem] text-sm font-semibold leading-5 text-[var(--muted)]">
              Güvenilir ustaları keşfet, işini kolaylaştır.
            </p>
            <BulletList items={customerActions} />
            <Button
              className="relative z-10 mt-5 h-11 min-h-11 rounded-md bg-[var(--brand-navy)] px-4 shadow-[var(--shadow-card)] hover:bg-[var(--brand-navy-deep)]"
              href={appRoutes.providers}
            >
              Usta Bul
            </Button>
            <PersonIllustration tone="customer" />
          </article>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,0.9fr)]">
          <div className="grid rounded-lg border border-[var(--border)] bg-white shadow-[var(--shadow-subtle)] sm:grid-cols-3">
            {stats.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  className="flex min-w-0 items-center gap-3 border-b border-[var(--border)] px-4 py-4 last:border-b-0 sm:border-r sm:[&:nth-child(3n)]:border-r-0 sm:[&:nth-last-child(-n+3)]:border-b-0"
                  key={item.label}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[var(--brand-orange-soft)] text-[var(--brand-orange)]">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-extrabold leading-5 text-[var(--brand-navy)]">
                      {item.value}
                    </span>
                    <span className="mt-1 block text-xs font-semibold leading-4 text-[var(--muted)]">
                      {item.label}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>

          <article className="relative overflow-hidden rounded-lg border border-[var(--border)] bg-[linear-gradient(100deg,#ffffff_0%,#f7f9fc_56%,#fff2e8_100%)] p-5 shadow-[var(--shadow-subtle)]">
            <div className="relative z-10 max-w-md">
              <h2 className="text-2xl font-extrabold leading-tight text-[var(--brand-navy)]">
                Güvenli Ödeme Altyapısı
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--muted)]">
                Nakit, IBAN/Havale ve online ödeme yakında tercihleri ödeme takip kaydına bağlanır.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {["Nakit", "IBAN / Havale", "Online ödeme yakında"].map((label) => (
                  <span
                    className="rounded-md border border-[rgba(10,37,64,0.08)] bg-white px-3 py-2 text-xs font-extrabold text-[var(--brand-navy)] shadow-[var(--shadow-subtle)]"
                    key={label}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <LockPaymentIllustration />
          </article>
        </div>
      </Container>
    </section>
  );
}
