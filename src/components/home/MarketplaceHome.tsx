import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ClipboardList,
  MessageCircle,
  Search,
  ShieldCheck,
  Star,
  UserPlus,
  Wallet,
} from "lucide-react";
import {
  LayeredHomeStack,
  TiltServiceCard,
} from "@/components/home/HomeInteractiveVisuals";
import { Container } from "@/components/ui/Container";
import { appRoutes } from "@/lib/constants/navigation";
import { serviceCategories } from "@/lib/constants/services";
import { PROVIDER_AVAILABILITY_STATUSES } from "@/lib/constants/statuses";
import {
  getMarketplaceTrustMetrics,
  getProviderDirectory,
} from "@/services/providers";

function formatMetric(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 0,
  }).format(value);
}

function HomeButton({
  children,
  href,
  tone = "primary",
}: {
  children: ReactNode;
  href: string;
  tone?: "primary" | "ghost";
}) {
  const className =
    tone === "primary"
      ? "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-[linear-gradient(140deg,#FF8A33,#FF6B00_58%,#C24E00)] px-5 text-sm font-extrabold text-[#0F0F0F] shadow-[0_16px_34px_-18px_rgba(255,107,0,0.7)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_44px_-18px_rgba(255,107,0,0.82)] focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:ring-offset-2 focus:ring-offset-[#0F0F0F]"
      : "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full border border-[#F9F8F5]/10 bg-[#F9F8F5]/[0.03] px-5 text-sm font-extrabold text-[#F9F8F5] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#F9F8F5]/30 hover:bg-[#F9F8F5]/[0.06] focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:ring-offset-2 focus:ring-offset-[#0F0F0F]";

  return (
    <Link className={className} href={href}>
      {children}
    </Link>
  );
}

function SectionHeading({
  align = "left",
  description,
  eyebrow,
  title,
}: {
  align?: "left" | "center";
  description?: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div
      className={
        align === "center"
          ? "mx-auto max-w-3xl cursor-default select-none text-center"
          : "max-w-3xl cursor-default select-none"
      }
    >
      <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#FF8A33]">
        {eyebrow}
      </p>
      <h2
        className="mt-3 text-3xl font-extrabold leading-tight text-[#F9F8F5] sm:text-4xl"
        style={{ fontFamily: "var(--font-fuwu-display)" }}
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-base font-medium leading-7 text-[#F9F8F5]/60">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export async function MarketplaceHome() {
  const { allProviders, filterOptions } = await getProviderDirectory();
  const todayProviders = allProviders.filter(
    (provider) => provider.availability === PROVIDER_AVAILABILITY_STATUSES.musait,
  );
  const metrics = await getMarketplaceTrustMetrics({
    activeProviders: allProviders.length,
    districts: filterOptions.districts.length,
    serviceCategories: serviceCategories.length,
  });
  const popularServices = serviceCategories.slice(0, 6);
  const heroStats = [
    { label: "komisyon", value: "%0" },
    { label: "hizmet kategorisi", value: formatMetric(metrics.serviceCategories) },
    { label: "ilçe kapsamı", value: formatMetric(metrics.districts) },
    { label: "talep girişi", value: "7/24" },
  ];
  const steps = [
    {
      description:
        "Ne yapılmasını istediğini birkaç cümleyle yaz, semtini seç. 2 dakikanı alır.",
      icon: ClipboardList,
      number: "01",
      title: "İşini anlat",
    },
    {
      description:
        "Bölgendeki uygun ustalar sana doğrudan fiyat ve müsaitlik gönderir.",
      icon: MessageCircle,
      number: "02",
      title: "Teklifleri gör",
    },
    {
      description: "En uygun teklifi seç, ustayla doğrudan konuş. Aracı yok, komisyon yok.",
      icon: CheckCircle2,
      number: "03",
      title: "Ustanı seç, işi başlat",
    },
  ];
  const trustItems = [
    {
      description:
        "Platforma katılan her usta, kimlik ve iletişim doğrulamasından geçer. Kiminle çalıştığını bilirsin.",
      icon: ShieldCheck,
      title: "Kimliği doğrulanmış ustalar",
    },
    {
      description:
        "Anlaştığın fiyatın tamamı ustaya gider. FUWU, işin üzerinden kesinti yapmaz.",
      icon: Wallet,
      title: "Komisyon almayız",
    },
    {
      description:
        "Sadece işi tamamlanan müşteriler yorum bırakabilir. Puanlar, gerçek işlerden gelir.",
      icon: Star,
      title: "Gerçek yorumlar",
    },
  ];
  const faqItems = [
    {
      answer:
        "Evet. Uygun hizmet kategorisini seçip doğrudan usta profillerini inceleyebilir ya da talep oluşturabilirsin.",
      question: "Şimdi hizmet talep edebilir miyim?",
    },
    {
      answer:
        "FUWU profillerinde kimlik, iletişim ve profil güven sinyalleri görünür tutulur; amaç kiminle konuştuğunu baştan netleştirmek.",
      question: "Ustalar kontrol ediliyor mu?",
    },
    {
      answer:
        "Hayır. FUWU, ilk anlaşmaya komisyon eklemez; fiyat ve ödeme detayını ustayla doğrudan netleştirirsin.",
      question: "Şimdi ödeme yapmam gerekiyor mu?",
    },
  ];

  return (
    <div className="bg-[#0F0F0F] text-[#F9F8F5]">
      <section className="relative isolate overflow-hidden border-b border-[#F9F8F5]/10 bg-[linear-gradient(180deg,#0F0F0F_0%,#151515_58%,#0F0F0F_100%)] py-16 sm:py-20 lg:py-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.16]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(249,248,245,.14) 1px, transparent 1px), linear-gradient(90deg, rgba(249,248,245,.12) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />
        <Container className="grid max-w-7xl items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)]">
          <div className="min-w-0">
            <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#FF6B00]/30 bg-[#FF6B00]/10 px-3 text-xs font-extrabold uppercase tracking-[0.12em] text-[#FF8A33]">
              <span className="size-2 rounded-full bg-[#FF6B00] shadow-[0_0_12px_rgba(255,107,0,0.9)]" />
              Türkiye&apos;de bir ilk
            </span>
            <h1
              className="mt-6 max-w-3xl text-5xl font-extrabold leading-[1.04] text-[#F9F8F5] sm:text-6xl lg:text-7xl"
              style={{ fontFamily: "var(--font-fuwu-display)" }}
            >
              Evin için doğru ustayı,{" "}
              <span className="text-[#FF6B00]">komisyonsuz</span> bul.
            </h1>
            <p className="mt-6 max-w-2xl text-base font-medium leading-8 text-[#F9F8F5]/60 sm:text-lg">
              FUWU, elektrikten temizliğe, tesisattan tadilata kadar her işi güvenilir
              ustalarla buluşturur. Aracı yok, gizli ücret yok; sadece işini bilen biriyle
              doğrudan anlaşma.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <HomeButton href={appRoutes.providers}>
                <Search aria-hidden="true" className="size-4" />
                Ustanı bul
              </HomeButton>
              <HomeButton href={appRoutes.providerApplication} tone="ghost">
                <UserPlus aria-hidden="true" className="size-4" />
                Usta olarak katıl
              </HomeButton>
            </div>
            <div className="mt-10 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
              {heroStats.map((stat) => (
                <div className="cursor-default select-none" key={stat.label}>
                  <p className="font-mono text-2xl font-extrabold leading-none text-[#F9F8F5]">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-xs font-bold text-[#F9F8F5]/40">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <LayeredHomeStack />
        </Container>
      </section>

      <section className="border-b border-[#F9F8F5]/10 py-16 sm:py-20" id="how-it-works">
        <Container className="max-w-7xl">
          <SectionHeading
            align="center"
            description="Karmaşık formlar yok. İhtiyacını yaz, teklifleri karşılaştır, işi başlat."
            eyebrow="Nasıl çalışır"
            title="Üç adımda, işini bilen biriyle tanış"
          />
          <div className="mt-10 grid overflow-hidden rounded-lg border border-[#F9F8F5]/10 bg-[#F9F8F5]/10 md:grid-cols-3 md:gap-px">
            {steps.map((step) => {
              const Icon = step.icon;

              return (
                <article className="bg-[#17171A] p-6 sm:p-8" key={step.number}>
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-mono text-sm font-extrabold text-[#FF8A33]">
                      {step.number}
                    </span>
                    <span className="inline-flex size-11 items-center justify-center rounded-lg border border-[#F9F8F5]/10 bg-[#F9F8F5]/[0.04] text-[#FF8A33]">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                  </div>
                  <h3 className="mt-6 text-xl font-extrabold text-[#F9F8F5]">{step.title}</h3>
                  <p className="mt-3 text-sm font-medium leading-6 text-[#F9F8F5]/60">
                    {step.description}
                  </p>
                </article>
              );
            })}
          </div>
        </Container>
      </section>

      <section className="border-b border-[#F9F8F5]/10 bg-[#111111] py-16 sm:py-20" id="services">
        <Container className="max-w-7xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeading
              description="En çok aranan kategorilerden başla, ya da işini yazıp uygun ustayı sana biz bulalım."
              eyebrow="Hizmetler"
              title="Evinle ilgili her iş, tek yerde"
            />
            <Link
              className="inline-flex min-h-11 w-fit cursor-pointer items-center gap-2 rounded-full border border-[#F9F8F5]/10 px-4 text-sm font-extrabold text-[#F9F8F5] transition-colors hover:border-[#FF6B00]/40 hover:text-[#FF8A33] focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:ring-offset-2 focus:ring-offset-[#111111]"
              href={appRoutes.services}
            >
              Tüm hizmetleri gör
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {popularServices.map((service) => (
              <TiltServiceCard
                category={service.category}
                description={service.description}
                href={service.href}
                iconName={service.iconName}
                key={service.id}
                title={service.title}
              />
            ))}
          </div>
        </Container>
      </section>

      <section className="border-b border-[#F9F8F5]/10 py-16 sm:py-20" id="about">
        <Container className="max-w-7xl">
          <SectionHeading
            align="center"
            eyebrow="Neden FUWU"
            title="Güven, konuşarak değil; sistemle kurulur"
          />
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {trustItems.map((item) => {
              const Icon = item.icon;

              return (
                <article className="cursor-default select-none rounded-lg p-2" key={item.title}>
                  <span className="inline-flex size-12 items-center justify-center rounded-lg border border-[#F9F8F5]/10 bg-[#F9F8F5]/[0.04] text-[#FF8A33]">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <h3 className="mt-5 text-xl font-extrabold text-[#F9F8F5]">{item.title}</h3>
                  <p className="mt-3 text-sm font-medium leading-6 text-[#F9F8F5]/60">
                    {item.description}
                  </p>
                </article>
              );
            })}
          </div>
        </Container>
      </section>

      <section className="border-b border-[#F9F8F5]/10 bg-[#F9F8F5] py-16 text-[#0F0F0F] sm:py-20" id="trust">
        <Container className="max-w-7xl">
          <div className="grid gap-8 rounded-lg border border-[#0F0F0F]/10 bg-white p-6 shadow-[0_24px_70px_-46px_rgba(15,15,15,0.42)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-10">
            <div>
              <p
                className="text-2xl font-extrabold leading-10 text-[#0F0F0F] sm:text-3xl"
                style={{ fontFamily: "var(--font-fuwu-display)" }}
              >
                &ldquo;Mutfaktaki su kaçağı için akşam saat 9&apos;da ilan verdim, sabah
                usta kapımdaydı. Komisyon derdi olmadan, direkt anlaştık.&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-3">
                <span className="inline-flex size-11 items-center justify-center rounded-full bg-[linear-gradient(145deg,#FF8A33,#FF6B00)] text-sm font-extrabold text-[#0F0F0F]">
                  EK
                </span>
                <div className="cursor-default select-none">
                  <p className="font-extrabold text-[#0F0F0F]">Elif K.</p>
                  <p className="text-sm font-semibold text-[#0F0F0F]/60">Kadıköy, İstanbul</p>
                </div>
              </div>
            </div>
            <div className="border-t border-[#0F0F0F]/10 pt-6 md:border-l md:border-t-0 md:pl-10 md:pt-0">
              <p className="font-mono text-5xl font-extrabold text-[#FF6B00]">%0</p>
              <p className="mt-2 text-sm font-extrabold uppercase tracking-[0.12em] text-[#0F0F0F]/50">
                komisyon, her zaman
              </p>
              <div className="mt-6 grid gap-3 text-sm font-bold text-[#0F0F0F]/70">
                <span className="inline-flex items-center gap-2">
                  <BadgeCheck aria-hidden="true" className="size-4 text-[#17745F]" />
                  {formatMetric(metrics.activeProviders)} aktif usta
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 aria-hidden="true" className="size-4 text-[#17745F]" />
                  {formatMetric(metrics.completedRequests)} tamamlanan talep
                </span>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-b border-[#F9F8F5]/10 py-16 sm:py-20">
        <Container className="max-w-7xl">
          <div className="grid gap-6 rounded-lg border border-[#F9F8F5]/10 bg-[#17171A] p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="cursor-default select-none">
              <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#FF8A33]">
                Ustalar için
              </p>
              <h2
                className="mt-3 max-w-3xl text-3xl font-extrabold leading-tight text-[#F9F8F5] sm:text-4xl"
                style={{ fontFamily: "var(--font-fuwu-display)" }}
              >
                İşini büyüt, kazancının tamamı sende kalsın
              </h2>
              <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-[#F9F8F5]/60">
                FUWU&apos;ya usta olarak katıl, bölgendeki müşteri taleplerine ulaş. Üyelik ve iş
                kabulü ücretsiz.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <HomeButton href={appRoutes.providerApplication}>
                <UserPlus aria-hidden="true" className="size-4" />
                Usta olarak katıl
              </HomeButton>
              <HomeButton href={appRoutes.howItWorks} tone="ghost">
                <ArrowRight aria-hidden="true" className="size-4" />
                Nasıl çalıştığını gör
              </HomeButton>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-b border-[#F9F8F5]/10 bg-[#111111] py-16 sm:py-20" id="faq">
        <Container className="grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeading
            description="Başlamadan önce en çok sorulan konuları kısa ve net tutuyoruz."
            eyebrow="Kısa cevaplar"
            title="Komisyon yoksa akış nasıl ilerler?"
          />
          <div className="grid gap-3">
            {faqItems.map((item) => (
              <details
                className="group rounded-lg border border-[#F9F8F5]/10 bg-[#17171A] p-5 open:border-[#FF6B00]/40"
                key={item.question}
              >
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-extrabold text-[#F9F8F5] [&::-webkit-details-marker]:hidden">
                  <span>{item.question}</span>
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#F9F8F5]/10 text-[#FF8A33] transition-transform duration-200 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm font-medium leading-6 text-[#F9F8F5]/60">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-[#0F0F0F] py-10">
        <Container className="flex flex-col gap-3 text-sm font-semibold text-[#F9F8F5]/40 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Bugün müsait görünen usta sayısı:{" "}
            <span className="font-mono font-extrabold text-[#F9F8F5]">
              {formatMetric(todayProviders.length)}
            </span>
          </p>
          <Link
            className="inline-flex min-h-11 w-fit cursor-pointer items-center gap-2 rounded-full text-[#FF8A33] transition-colors hover:text-[#F9F8F5] focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:ring-offset-2 focus:ring-offset-[#0F0F0F]"
            href={appRoutes.request}
          >
            Talep oluştur
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </Container>
      </section>
    </div>
  );
}
