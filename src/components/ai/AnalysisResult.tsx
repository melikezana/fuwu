"use client";

import { AlertTriangle, CheckCircle2, RotateCcw, Search, ShieldCheck, Upload } from "lucide-react";
import type { AssistantAnalysis } from "@/lib/ai/assistant-schema";
import { cn } from "@/lib/utils";

type AnalysisResultProps = {
  analysis: AssistantAnalysis;
  hasProviders: boolean;
  onAskMore: () => void;
  onEmailSupport: () => void;
  onFindProviders: () => void;
  onNewPhoto: () => void;
};

const categoryLabels: Record<AssistantAnalysis["category"], string> = {
  carpet_cleaning: "Halı Yıkama",
  cleaning: "Temizlik",
  electric: "Elektrik",
  furniture: "Mobilya Montajı",
  locksmith: "Çilingir",
  moving: "Nakliye",
  painting: "Boya Badana",
  plumbing: "Tesisat",
  pool_garden: "Havuz ve Bahçe Bakımı",
  renovation: "Ev Tadilatı",
  unknown: "Netleştirilecek",
  white_goods: "Beyaz Eşya",
};

const urgencyStyles: Record<
  AssistantAnalysis["urgency"],
  {
    className: string;
    label: string;
  }
> = {
  emergency: {
    className: "bg-red-50 text-red-700 ring-red-100",
    label: "Acil",
  },
  high: {
    className: "bg-orange-50 text-orange-700 ring-orange-100",
    label: "Yüksek",
  },
  low: {
    className: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    label: "Düşük",
  },
  medium: {
    className: "bg-yellow-50 text-yellow-700 ring-yellow-100",
    label: "Orta",
  },
};

function ResultList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-sm font-semibold text-[var(--muted)]">Ek bilgi yok.</p>;
  }

  return (
    <ul className="grid gap-2">
      {items.map((item) => (
        <li className="grid grid-cols-[18px_minmax(0,1fr)] gap-2 text-sm font-semibold leading-6 text-[var(--brand-navy)]" key={item}>
          <CheckCircle2 aria-hidden className="mt-1 size-4 text-[var(--trust-green)]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function AnalysisResult({
  analysis,
  hasProviders,
  onAskMore,
  onEmailSupport,
  onFindProviders,
  onNewPhoto,
}: AnalysisResultProps) {
  const urgency = urgencyStyles[analysis.urgency];
  const confidenceLabel = `${Math.round(analysis.confidence * 100)}%`;
  const shouldShowProviderCta =
    analysis.professionalNeeded &&
    analysis.providerSearchRecommended &&
    analysis.urgency !== "emergency";

  return (
    <section className="grid gap-3 rounded-[24px] border border-[rgba(10,37,64,0.1)] bg-white p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[var(--brand-orange)]">
            İlk değerlendirme hazır
          </p>
          <h2 className="mt-1 text-lg font-extrabold text-[var(--brand-navy)]">
            {analysis.professionalNeeded
              ? "Olası sorun ve güvenli yönlendirme"
              : "Usta çağırmadan önce deneyebileceğin güvenli adımlar"}
          </h2>
        </div>
        <span className={cn("inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-extrabold ring-1", urgency.className)}>
          {urgency.label}
        </span>
      </div>

      {analysis.emergencyMessage ? (
        <div className="grid grid-cols-[22px_minmax(0,1fr)] gap-2 rounded-3xl bg-red-50 p-3 text-sm font-bold leading-6 text-red-800">
          <AlertTriangle aria-hidden className="mt-1 size-5" />
          <p>{analysis.emergencyMessage}</p>
        </div>
      ) : null}

      <p className="text-sm font-semibold leading-6 text-[var(--muted)]">{analysis.summary}</p>

      <div className="grid gap-3 rounded-3xl bg-[var(--surface-soft)] p-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[var(--muted)]">Olası sorun</p>
            <p className="mt-1 font-extrabold text-[var(--brand-navy)]">{analysis.likelyIssue}</p>
          </div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[var(--muted)]">Önerilen hizmet</p>
            <p className="mt-1 font-extrabold text-[var(--brand-navy)]">{categoryLabels[analysis.category]}</p>
          </div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[var(--muted)]">Usta gerekli mi?</p>
            <p className="mt-1 font-extrabold text-[var(--brand-navy)]">
              {analysis.professionalNeeded ? "Evet, yerinde inceleme gerekebilir." : "Şimdilik şart görünmüyor."}
            </p>
          </div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[var(--muted)]">Güven seviyesi</p>
            <p className="mt-1 font-extrabold text-[var(--brand-navy)]">{confidenceLabel}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        <div>
          <p className="mb-2 inline-flex items-center gap-2 text-sm font-extrabold text-[var(--brand-navy)]">
            <ShieldCheck aria-hidden className="size-4 text-[var(--trust-green)]" />
            Güvenli ilk adımlar
          </p>
          <ResultList items={analysis.safeFirstSteps} />
        </div>
        <div>
          <p className="mb-2 inline-flex items-center gap-2 text-sm font-extrabold text-[var(--brand-navy)]">
            <AlertTriangle aria-hidden className="size-4 text-[var(--brand-orange)]" />
            Yapmaman gerekenler
          </p>
          <ResultList items={analysis.avoidDoing} />
        </div>
      </div>

      {analysis.followUpQuestions.length > 0 ? (
        <div className="rounded-3xl border border-[rgba(10,37,64,0.1)] bg-white p-3">
          <p className="text-sm font-extrabold text-[var(--brand-navy)]">Kısa takip soruları</p>
          <ul className="mt-2 grid gap-2">
            {analysis.followUpQuestions.map((question) => (
              <li className="text-sm font-semibold leading-6 text-[var(--muted)]" key={question}>
                {question}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        {shouldShowProviderCta ? (
          <button
            className="inline-flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[var(--brand-orange)] px-4 text-sm font-extrabold text-white shadow-[var(--shadow-action)] transition-colors hover:bg-[var(--brand-orange-dark)]"
            onClick={onFindProviders}
            type="button"
          >
            <Search aria-hidden className="size-4" />
            {hasProviders ? "Uygun Ustaları Gör" : "Sorun devam ederse usta bul"}
          </button>
        ) : null}
        <button
          className="inline-flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[rgba(10,37,64,0.12)] bg-white px-4 text-sm font-extrabold text-[var(--brand-navy)] transition-colors hover:bg-[var(--brand-orange-soft)]"
          onClick={onNewPhoto}
          type="button"
        >
          <Upload aria-hidden className="size-4" />
          Yeni Fotoğraf Yükle
        </button>
        <button
          className="inline-flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[rgba(10,37,64,0.12)] bg-white px-4 text-sm font-extrabold text-[var(--brand-navy)] transition-colors hover:bg-[var(--brand-orange-soft)]"
          onClick={onAskMore}
          type="button"
        >
          <RotateCcw aria-hidden className="size-4" />
          Bir Soru Daha Sor
        </button>
        <button
          className="inline-flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[var(--brand-navy)] px-4 text-sm font-extrabold text-white transition-colors hover:bg-[var(--brand-navy-deep)]"
          onClick={onEmailSupport}
          type="button"
        >
          E-posta ile Destek Al
        </button>
      </div>
    </section>
  );
}
