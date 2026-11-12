import Link from "next/link";
import { ArrowRight, CalendarCheck, CheckCircle2, KeyRound, PackageCheck, ShieldCheck, Star, ThumbsUp, XCircle } from "lucide-react";
import type { RecommendedService } from "@/lib/ai/service-recommendations";

const money = (minor: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(minor / 100);
const duration = (minutes: number) => (minutes >= 60 ? `${Math.floor(minutes / 60)} sa${minutes % 60 ? ` ${minutes % 60} dk` : ""}` : `${minutes} dk`);

const secureSteps = [
  { icon: CalendarCheck, title: "Randevu", text: "Ustanın takviminden sana uyan saati seçersin." },
  { icon: KeyRound, title: "Kapıda doğrulama kodu", text: "Usta geldiğinde kodu sen verirsin; gelen kişinin doğru usta olduğu kayda geçer." },
  { icon: ShieldCheck, title: "İş tamamlama", text: "Usta işi bitirdiğini bildirir; kapsam dışı iş için önce sana sorar." },
  { icon: ThumbsUp, title: "Senin onayın", text: "İşi sen onaylarsın. Sorun varsa sipariş ekranından bildirirsin." },
];

/** Seçimden sonra işleyen güvenli süreç. Satış açılmadan önce de müşterinin ne bekleyeceğini gösterir. */
export function SecureProcessSteps() {
  return (
    <section aria-labelledby="assistant-secure-title" className="rounded-3xl border border-[rgba(10,37,64,0.1)] bg-white p-3">
      <p className="text-sm font-extrabold text-[var(--brand-navy)]" id="assistant-secure-title">Seçtikten sonra ne olur?</p>
      <ol className="mt-2 grid gap-2">
        {secureSteps.map(({ icon: Icon, title, text }, index) => (
          <li className="grid grid-cols-[32px_minmax(0,1fr)] gap-2" key={title}>
            <span className="inline-flex size-8 items-center justify-center rounded-xl bg-[var(--trust-green-soft)] text-[var(--trust-green)]"><Icon aria-hidden className="size-4" /></span>
            <span className="text-xs font-semibold leading-5 text-[var(--muted)]"><strong className="block text-sm font-extrabold text-[var(--brand-navy)]">{index + 1}. {title}</strong>{text}</span>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs font-bold leading-5 text-[var(--muted)]">Online satın alma henüz açılmadı; süreç satış açıldığında bu şekilde işler.</p>
    </section>
  );
}

/** Asistanın bulduğu soruna uyan sabit kapsamlı hizmetler: dahil olanlar, olmayanlar ve usta paketlerinin karşılaştırması. */
export function RecommendedServices({ services }: { services: RecommendedService[] }) {
  if (!services.length) return null;
  return (
    <section aria-labelledby="assistant-service-title" className="grid gap-3">
      <div>
        <p className="text-sm font-extrabold text-[var(--brand-navy)]" id="assistant-service-title">Bu iş için uygun hizmetler</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-[var(--muted)]">Kapsamı ve fiyatı önceden belli. Dahil olanları ve usta paketlerini karşılaştır.</p>
      </div>
      <ul className="grid gap-3">
        {services.map(service => (
          <li className="rounded-3xl border border-[rgba(10,37,64,0.1)] bg-white p-3 shadow-[var(--shadow-subtle)]" key={service.id}>
            <Link className="flex min-h-[52px] items-center gap-3 rounded-2xl transition-colors hover:bg-[var(--brand-orange-soft)]" href={service.href}>
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]"><PackageCheck aria-hidden className="size-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-extrabold text-[var(--brand-navy)]">{service.name}</span>
                <span className="block truncate text-xs font-semibold text-[var(--muted)]">{service.startingPriceMinor ? `${money(service.startingPriceMinor)}'den başlayan fiyatlarla` : service.description}</span>
              </span>
              <ArrowRight aria-hidden className="size-4 shrink-0 text-[var(--brand-navy)]" />
            </Link>
            {service.scope || service.exclusions ? (
              <dl className="mt-2 grid gap-2 text-xs font-semibold leading-5">
                {service.scope ? (
                  <div className="grid grid-cols-[18px_minmax(0,1fr)] gap-2">
                    <CheckCircle2 aria-hidden className="mt-0.5 size-4 text-[var(--trust-green)]" />
                    <div><dt className="font-extrabold text-[var(--brand-navy)]">Dahil olanlar</dt><dd className="text-[var(--muted)]">{service.scope}</dd></div>
                  </div>
                ) : null}
                {service.exclusions ? (
                  <div className="grid grid-cols-[18px_minmax(0,1fr)] gap-2">
                    <XCircle aria-hidden className="mt-0.5 size-4 text-[var(--brand-orange-dark)]" />
                    <div><dt className="font-extrabold text-[var(--brand-navy)]">Dahil olmayanlar</dt><dd className="text-[var(--muted)]">{service.exclusions}</dd></div>
                  </div>
                ) : null}
              </dl>
            ) : null}
            {service.offers?.length ? (
              <div className="mt-3">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--muted)]">Usta paketlerini karşılaştır</p>
                <ul className="mt-1 grid gap-2">
                  {service.offers.map(offer => (
                    <li key={offer.id}>
                      <Link className="grid min-h-[56px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-[rgba(10,37,64,0.1)] bg-[var(--surface-soft)] px-3 py-2 transition-colors hover:border-[var(--brand-orange)] hover:bg-[var(--brand-orange-soft)]" href={offer.href}>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-extrabold text-[var(--brand-navy)]">{offer.providerName}</span>
                          <span className="flex flex-wrap items-center gap-x-2 text-xs font-semibold text-[var(--muted)]">
                            {offer.variantName ? <span>{offer.variantName}</span> : null}
                            <span>Yaklaşık {duration(offer.durationMinutes)}</span>
                            {offer.rating !== null ? <span className="inline-flex items-center gap-1"><Star aria-hidden className="size-3 text-[var(--brand-orange)]" />{offer.rating.toFixed(1)} · {offer.reviewCount} yorum</span> : <span>Henüz yorum yok</span>}
                          </span>
                        </span>
                        <span className="text-right">
                          <strong className="block text-sm font-extrabold text-[var(--brand-navy)]">{money(offer.priceMinor)}</strong>
                          <span className="text-[11px] font-bold text-[var(--brand-orange-dark)]">Profil ve müsait saatler</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
