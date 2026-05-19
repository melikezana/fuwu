<<<<<<< HEAD
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { appRoutes, ctaLabels } from "@/lib/constants/navigation";
import { features } from "@/lib/constants/features";

export function FeatureSection() {
  return (
    <section className="border-y border-[var(--border)] bg-white" id="why">
      <Container className="py-14 sm:py-16 lg:py-20">
        <SectionIntro
          eyebrow="Neden Fuwu"
          title="Karar vermeyi hızlandıran net bilgiler."
          description="Fuwu ilk adımı net tutar; ihtiyacını belirler, fiyat aralığını görür ve güven veren bilgilerle ilerlersin."
        />

        <div className="mt-8 grid gap-4 md:grid-cols-3 lg:gap-5">
          {features.map((feature, index) => (
            <div
              className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-6"
              key={feature.id}
            >
              <p className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--brand-navy)] text-sm font-bold text-white">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-5 text-xl font-bold leading-tight text-[var(--brand-navy)]">
                {feature.title}
              </h3>
              <p className="mt-3 leading-7 text-[var(--muted)]">{feature.description}</p>
            </div>
          ))}
=======
"use client";

import { useTranslation } from "@/lib/i18n";
import { ShieldCheck, Zap, PhoneCall } from "lucide-react";

export default function FeatureSection() {
  const { t } = useTranslation();

  const features = [
    {
      key: "trust",
      icon: <ShieldCheck size={28} className="text-white" />,
    },
    {
      key: "speed",
      icon: <Zap size={28} className="text-white" />,
    },
    {
      key: "support",
      icon: <PhoneCall size={28} className="text-white" />,
    }
  ];

  return (
    <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-20 md:grid-cols-3">
      {features.map((item) => (
        <div key={item.key} className="rounded-3xl bg-white p-7 shadow-md transition-transform hover:-translate-y-1">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF8A00] shadow-sm shadow-[#FF8A00]/20">
            {item.icon}
          </div>
          <h4 className="mb-3 text-xl font-bold">{t(`features.${item.key}.title` as any)}</h4>
          <p className="text-gray-600">{t(`features.${item.key}.desc` as any)}</p>
>>>>>>> 41e55ab (Full marketplace backend auth and production update)
        </div>

        <div className="mt-8 flex flex-col gap-3 rounded-lg border border-[rgba(255,138,0,0.26)] bg-[var(--brand-orange-soft)] p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl font-bold leading-6 text-[var(--brand-navy)]">
            İhtiyacını belirle, kısa bir not ekle ve uygun ustaya daha hızlı ulaş.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button className="w-full sm:w-fit" href={appRoutes.request}>
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
        </div>
      </Container>
    </section>
  );
}
