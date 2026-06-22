import { MobileCollapsibleSection } from "@/components/home/MobileCollapsibleSection";
import { SectionHeading } from "@/components/home/MarketplaceSocialSections";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { appRoutes } from "@/lib/constants/navigation";
import { I18nText } from "@/lib/i18n";

export function MarketplaceHowItWorksSection() {
  const steps = [
    {
      title: "Hizmetini seç",
      description: "İhtiyacına en yakın ev hizmetini seç.",
      label: "Hizmet",
    },
    {
      title: "Bütçeni belirle",
      description: "Tahmini fiyatı gör, teklifini netleştir.",
      label: "Bütçe",
    },
    {
      title: "Uygun ustayı bul",
      description: "Bölgendeki uygun ustalarla eşleş.",
      label: "Eşleşme",
    },
    {
      title: "Ustan gelsin",
      description: "Doğrulama ile güvenli başlangıç yap.",
      label: "Güvenli başlangıç",
    },
  ];

  return (
    <section className="border-y border-[var(--border)] bg-[#FAFAFA]" id="how-it-works">
      <Container className="max-w-7xl py-14 sm:py-16">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[var(--brand-navy)] sm:text-3xl">
            Fuwu ile Hızlı Eşleş
          </h2>
          <p className="mt-2 text-sm font-medium text-[#6B7280]">
            Tek platform, anında çözüm
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div
              className="rounded-lg bg-white p-5 shadow-[var(--shadow-subtle)] ring-1 ring-[#F3F4F6]"
              key={step.title}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF8EF] text-base font-bold text-[var(--brand-orange-dark)] ring-1 ring-[rgba(255,138,0,0.18)]">
                  {index + 1}
                </span>

                <span className="rounded-md bg-[#F9FAFB] px-2 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-[#4B5563]">
                  {step.label}
                </span>
              </div>

              <h3 className="mt-4 text-lg font-bold leading-tight text-[var(--brand-navy)]">
                {step.title}
              </h3>

              <p className="mt-2 text-sm font-medium leading-6 text-[#6B7280]">
                {step.description}
              </p>

              <div className="mt-4 h-1 w-12 rounded-full bg-[var(--brand-orange)]" />
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

export function MarketplaceAboutSection() {
  return (
    <section className="border-y border-[var(--border)] bg-white" id="about">
      <Container className="max-w-7xl py-12 sm:py-14 lg:py-16">
        <div className="grid gap-5 lg:grid-cols-[0.45fr_1fr] lg:items-start">
          <div className="cursor-default select-none">
            <p className="text-sm font-bold uppercase text-[var(--brand-orange-dark)]">
              <I18nText i18nKey="home.about.eyebrow" />
            </p>
            <h2 className="mt-3 text-3xl font-bold leading-tight text-[var(--brand-navy)] sm:text-4xl">
              <I18nText i18nKey="home.about.title" />
            </h2>
          </div>
          <MobileCollapsibleSection contentClassName="mt-4 lg:mt-0">
            <p className="max-w-3xl cursor-default select-none text-base font-semibold leading-8 text-[var(--muted)] sm:text-lg">
              <I18nText i18nKey="home.about.description" />
            </p>
          </MobileCollapsibleSection>
        </div>
      </Container>
    </section>
  );
}

export function MarketplaceTrustSection() {
  const trustItems = [
    {
      description: "Telefon veya WhatsApp ile araya aracı katmadan doğrudan görüş.",
      title: "Doğrudan Usta ile İletişim",
    },
    {
      description: "Fuwu ilk temas için gizli komisyon ya da görünmeyen hizmet bedeli eklemez.",
      title: "Gizli Komisyon Yok",
    },
    {
      description: "Hizmet, ilçe ve bütçe sinyallerine göre uygun profilleri hızlıca karşılaştır.",
      title: "Hızlı Eşleşme",
    },
    {
      description: "Tüm İstanbul ilçeleri için kategori ve bölge bazlı usta keşfi.",
      title: "İstanbul Geneli Hizmet",
    },
  ];

  return (
    <section className="bg-[#F7F7F8]" id="trust">
      <Container className="max-w-7xl py-12 sm:py-14 lg:py-16">
        <SectionHeading
          description="Karar vermeden önce profil güven sinyallerini, iletişim seçeneklerini ve hizmet kapsamını tek yerde gör."
          eyebrow="Güven"
          title="Neden Fuwu?"
        />
        <MobileCollapsibleSection contentClassName="mt-7">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {trustItems.map((item) => (
              <div
                className="cursor-default select-none rounded-lg bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-[rgba(13,20,36,0.08)]"
                key={item.title}
              >
                <div className="mb-5 h-1.5 w-12 rounded-full bg-[var(--brand-orange)]" />
                <h3 className="text-xl font-bold leading-tight text-[var(--brand-navy)]">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-[var(--muted)]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </MobileCollapsibleSection>
      </Container>
    </section>
  );
}

export function MarketplaceFinalCTASection() {
  return (
    <section className="border-t border-[var(--border)] bg-white">
      <Container className="max-w-7xl py-12 sm:py-14 lg:py-16">
        <div className="cursor-default select-none">
          <p className="text-sm font-bold uppercase text-[var(--brand-orange-dark)]">
            <I18nText i18nKey="home.final.eyebrow" />
          </p>
          <h2 className="mt-3 max-w-3xl text-3xl font-bold leading-tight text-[var(--brand-navy)] sm:text-4xl">
            <I18nText i18nKey="home.final.title" />
          </h2>
        </div>
        <MobileCollapsibleSection contentClassName="mt-7">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg bg-[#F7F7F8] p-6 shadow-[var(--shadow-elevated)] ring-1 ring-[rgba(13,20,36,0.08)]">
              <div className="cursor-default select-none">
                <p className="text-sm font-bold uppercase text-[var(--brand-orange-dark)]">
                  <I18nText i18nKey="home.final.customer" />
                </p>
                <h3 className="mt-3 text-2xl font-bold leading-tight text-[var(--brand-navy)]">
                  <I18nText i18nKey="home.final.customerTitle" />
                </h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-[var(--muted)]">
                  <I18nText i18nKey="home.final.customerDescription" />
                </p>
              </div>
              <Button className="mt-5 w-full sm:w-fit" href={appRoutes.providers}>
                <I18nText i18nKey="cta.findProvider" />
              </Button>
            </div>
            <div className="rounded-lg bg-white p-6 shadow-[var(--shadow-elevated)] ring-1 ring-[rgba(13,20,36,0.08)]">
              <div className="cursor-default select-none">
                <p className="text-sm font-bold uppercase text-[var(--brand-orange-dark)]">
                  <I18nText i18nKey="home.final.provider" />
                </p>
                <h3 className="mt-3 text-2xl font-bold leading-tight text-[var(--brand-navy)]">
                  <I18nText i18nKey="home.final.providerTitle" />
                </h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-[var(--muted)]">
                  <I18nText i18nKey="home.final.providerDescription" />
                </p>
              </div>
              <Button
                className="mt-5 w-full sm:w-fit"
                href={appRoutes.providerApplication}
                variant="secondary"
              >
                <I18nText i18nKey="cta.provider" />
              </Button>
            </div>
          </div>
        </MobileCollapsibleSection>
      </Container>
    </section>
  );
}
