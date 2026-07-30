import {
  BadgeCheck,
  History,
  LifeBuoy,
  MessageSquareText,
  PhoneCall,
  Star,
} from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { homeCopy } from "@/lib/constants/home";

const icons = [BadgeCheck, MessageSquareText, Star, History, PhoneCall, LifeBuoy] as const;

export function TrustSection() {
  return (
    <section
      className="border-b border-[var(--border)] bg-[linear-gradient(180deg,#ffffff_0%,#f7f9fc_100%)] py-14 sm:py-16 lg:py-20"
      id="trust"
    >
      <Container className="max-w-[1240px]">
        <div className="grid gap-8 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
          <div className="lg:sticky lg:top-24">
            <SectionIntro
              description={homeCopy.trust.description}
              eyebrow={homeCopy.trust.eyebrow}
              title={homeCopy.trust.title}
            />
            <div className="mt-7 rounded-lg border border-[rgba(20,33,61,0.1)] bg-white p-5 shadow-[var(--shadow-subtle)]">
              <p className="text-sm font-bold uppercase text-[var(--brand-orange-dark)]">
                Güven ilkesi
              </p>
              <p className="mt-2 text-lg font-extrabold leading-7 text-[var(--brand-navy)]">
                Kullanıcı kararını kanıtlanabilir bilgiyle verir.
              </p>
              <p className="mt-3 text-sm font-medium leading-6 text-[var(--muted)]">
                Bu yüzden Fuwu, profilde görünen veriyi net tutar; olmayan özelliği varmış gibi
                sunmaz.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {homeCopy.trust.items.map((item, index) => {
              const Icon = icons[index] ?? BadgeCheck;
              const isPlanned = item.status === "planned";

              return (
                <article
                  className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-subtle)]"
                  key={item.title}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="inline-flex size-11 items-center justify-center rounded-lg bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)] ring-1 ring-[rgba(249,115,22,0.18)]">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <span
                      className={
                        isPlanned
                          ? "rounded-full bg-[var(--brand-navy-soft)] px-2.5 py-1 text-xs font-bold text-[var(--brand-navy)]"
                          : "rounded-full bg-[var(--trust-green-soft)] px-2.5 py-1 text-xs font-bold text-[var(--trust-green)]"
                      }
                    >
                      {isPlanned ? "Geliştiriliyor" : "Mevcut"}
                    </span>
                  </div>
                  <h3 className="mt-5 text-xl font-extrabold leading-tight text-[var(--brand-navy)]">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm font-medium leading-6 text-[var(--muted)]">
                    {item.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
