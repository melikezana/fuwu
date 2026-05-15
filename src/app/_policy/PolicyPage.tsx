import Link from "next/link";
import { FuwuLogo, FuwuWatermark } from "@/components/brand/FuwuLogo";
import { Container } from "@/components/ui/Container";
import { appRoutes } from "@/lib/constants/navigation";

export type PolicySection = {
  title: string;
  body: string[];
};

type PolicyPageProps = {
  title: string;
  description: string;
  updatedAt: string;
  sections: PolicySection[];
};

const legalReviewNote =
  "Bu metin bilgilendirme amaçlıdır; yayına çıkmadan önce hukuki danışmanlıkla gözden geçirilmelidir.";

export function PolicyPage({ title, description, updatedAt, sections }: PolicyPageProps) {
  return (
    <section className="relative overflow-hidden border-b border-[var(--border)] bg-[linear-gradient(180deg,#FFFFFF_0%,#FAFAFB_54%,#F6F7F9_100%)]">
      <FuwuWatermark className="-right-20 top-10 text-[9rem] opacity-[0.035] sm:text-[12rem]" />
      <Container className="relative max-w-4xl py-10 sm:py-14 lg:py-16">
        <div className="cursor-default select-none">
          <Link
            aria-label="Fuwu ana sayfa"
            className="inline-flex cursor-pointer rounded-lg bg-white px-4 py-3 shadow-[0_18px_54px_rgba(13,20,36,0.07)] ring-1 ring-[rgba(13,20,36,0.08)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
            href={appRoutes.home}
          >
            <FuwuLogo size="md" />
          </Link>
          <p className="mt-7 text-sm font-black uppercase text-[var(--brand-orange-dark)]">
            Fuwu Politikaları
          </p>
          <h1 className="mt-3 text-4xl font-black leading-tight text-[var(--brand-navy)] sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 text-base font-semibold leading-8 text-[var(--muted)] sm:text-lg">
            {description}
          </p>
          <p className="mt-4 rounded-md border border-[rgba(255,138,0,0.24)] bg-white px-4 py-3 text-sm font-bold leading-6 text-[var(--muted)]">
            Son güncelleme: {updatedAt}
          </p>
          <p className="mt-3 rounded-md border border-[rgba(255,138,0,0.32)] bg-[var(--brand-orange-soft)] px-4 py-3 text-sm font-bold leading-6 text-[var(--brand-navy)]">
            {legalReviewNote}
          </p>
        </div>

        <div className="mt-8 grid gap-5">
          {sections.map((section) => (
            <section
              className="cursor-default select-none rounded-lg bg-white p-5 shadow-[0_18px_56px_rgba(13,20,36,0.07)] ring-1 ring-[rgba(13,20,36,0.08)] sm:p-6"
              key={section.title}
            >
              <h2 className="text-2xl font-black leading-tight text-[var(--brand-navy)]">
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
