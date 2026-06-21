import Link from "next/link";
import { FuwuLogo, FuwuWatermark } from "@/components/brand/FuwuLogo";
import { Container } from "@/components/ui/Container";
import { appRoutes } from "@/lib/constants/navigation";
import { I18nText, type TranslationKey } from "@/lib/i18n";

export type PolicySection = {
  title: string;
  body: string[];
};

type PolicyPageProps = {
  descriptionKey?: TranslationKey;
  title: string;
  description: string;
  titleKey?: TranslationKey;
  updatedAt: string;
  sections: PolicySection[];
};

export function PolicyPage({
  description,
  descriptionKey,
  sections,
  title,
  titleKey,
  updatedAt,
}: PolicyPageProps) {
  return (
    <section className="relative overflow-hidden border-b border-[var(--border)] bg-[linear-gradient(180deg,#FFFFFF_0%,#FAFAFB_54%,#F6F7F9_100%)]">
      <FuwuWatermark className="-right-20 top-10 text-[9rem] opacity-[0.035] sm:text-[12rem]" />
      <Container className="relative max-w-4xl py-10 sm:py-14 lg:py-16">
        <div className="cursor-default select-none">
          <Link
            aria-label="Fuwu ana sayfasına git"
            className="inline-flex cursor-pointer rounded-lg bg-white px-4 py-3 shadow-[var(--shadow-elevated)] ring-1 ring-[rgba(13,20,36,0.08)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
            href={appRoutes.home}
          >
            <FuwuLogo size="md" />
          </Link>
          <p className="mt-7 text-sm font-medium uppercase text-[var(--brand-orange-dark)]">
            <I18nText i18nKey="policy.eyebrow" />
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight text-[var(--brand-navy)] sm:text-5xl">
            {titleKey ? <I18nText i18nKey={titleKey} /> : title}
          </h1>
          <p className="mt-5 text-base font-semibold leading-8 text-[var(--muted)] sm:text-lg">
            {descriptionKey ? <I18nText i18nKey={descriptionKey} /> : description}
          </p>
          <p className="mt-4 rounded-md border border-[rgba(255,138,0,0.24)] bg-white px-4 py-3 text-sm font-bold leading-6 text-[var(--muted)]">
            <I18nText i18nKey="policy.updatedAt" values={{ date: updatedAt }} />
          </p>
          <p className="mt-3 rounded-md border border-[rgba(255,138,0,0.32)] bg-[var(--brand-orange-soft)] px-4 py-3 text-sm font-bold leading-6 text-[var(--brand-navy)]">
            <I18nText i18nKey="policy.reviewNote" />
          </p>
        </div>

        <div className="mt-8 grid gap-5">
          {sections.map((section) => (
            <section
              className="cursor-default select-none rounded-lg bg-white p-5 shadow-[var(--shadow-elevated)] ring-1 ring-[rgba(13,20,36,0.08)] sm:p-6"
              key={section.title}
            >
              <h2 className="text-2xl font-bold leading-tight text-[var(--brand-navy)]">
                {section.title}
              </h2>
              <div className="mt-4 grid gap-3 text-sm font-semibold leading-7 text-[var(--muted)] sm:text-base sm:leading-8">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </Container>
    </section>
  );
}
