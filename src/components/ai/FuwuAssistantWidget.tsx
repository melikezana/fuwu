"use client";

import { Bot, LifeBuoy, Mail, Send, Sparkles, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { FuwuAssistantPanel } from "./FuwuAssistantPanel";

type WidgetView = "menu" | "assistant" | "email";

type SupportDraft = {
  analysisSummary?: string;
  imageReference?: string | null;
};

function SupportEmailForm({
  draft,
  onBack,
  onClose,
}: {
  draft: SupportDraft;
  onBack: () => void;
  onClose: () => void;
}) {
  const [subject, setSubject] = useState("Fuwu Akıllı Asistan desteği");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [analysisSummary, setAnalysisSummary] = useState(draft.analysisSummary ?? "");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/support/messages", {
        body: JSON.stringify({
          analysisSummary,
          email,
          imageReference: draft.imageReference ?? null,
          message,
          subject,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Mesaj gönderilemedi.");
      }

      setFeedback(payload?.message ?? "Mesajın Fuwu Destek ekibine iletildi.");
      setMessage("");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Mesaj gönderilemedi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      aria-label="Fuwu Destek Ekibine Yaz"
      className="flex h-full max-h-[calc(100dvh-env(safe-area-inset-bottom)-0.5rem)] flex-col overflow-hidden rounded-t-[24px] border border-[rgba(10,37,64,0.12)] bg-white shadow-[0_28px_80px_rgba(10,37,64,0.22)] sm:h-auto sm:max-h-[calc(100vh-7rem)] sm:rounded-[24px]"
    >
      <header className="flex items-start justify-between gap-3 border-b border-[rgba(10,37,64,0.08)] px-4 py-4">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[var(--brand-orange)]">E-posta</p>
          <h2 className="mt-1 text-lg font-extrabold text-[var(--brand-navy)]">Fuwu Destek Ekibine Yaz</h2>
        </div>
        <button
          aria-label="E-posta formunu kapat"
          className="inline-flex size-11 cursor-pointer items-center justify-center rounded-2xl bg-[var(--surface-soft)] text-[var(--brand-navy)] transition-colors hover:bg-[var(--brand-orange-soft)]"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden className="size-5" />
        </button>
      </header>
      <form className="grid min-h-0 flex-1 gap-3 overflow-y-auto px-4 py-4" onSubmit={handleSubmit}>
        <label className="grid gap-1 text-xs font-extrabold text-[var(--brand-navy)]">
          Konu
          <input
            className="premium-control h-11 rounded-2xl px-3 text-sm font-semibold"
            onChange={(event) => setSubject(event.target.value)}
            value={subject}
          />
        </label>
        <label className="grid gap-1 text-xs font-extrabold text-[var(--brand-navy)]">
          E-posta
          <input
            autoComplete="email"
            className="premium-control h-11 rounded-2xl px-3 text-sm font-semibold"
            inputMode="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="ornek@eposta.com"
            type="email"
            value={email}
          />
        </label>
        <label className="grid gap-1 text-xs font-extrabold text-[var(--brand-navy)]">
          Mesaj
          <textarea
            className="premium-control min-h-28 resize-none rounded-[22px] px-4 py-3 text-sm font-semibold leading-6"
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Destek ekibine iletmek istediğin notu yaz..."
            value={message}
          />
        </label>
        <label className="grid gap-1 text-xs font-extrabold text-[var(--brand-navy)]">
          Varsa analiz özeti
          <textarea
            className="premium-control min-h-24 resize-none rounded-[22px] px-4 py-3 text-sm font-semibold leading-6"
            onChange={(event) => setAnalysisSummary(event.target.value)}
            placeholder="Akıllı Asistan sonucu buraya otomatik eklenir."
            value={analysisSummary}
          />
        </label>
        {draft.imageReference ? (
          <div className="rounded-2xl bg-[var(--surface-soft)] px-3 py-2 text-xs font-bold text-[var(--muted)]">
            Fotoğraf referansı: {draft.imageReference}
          </div>
        ) : null}
        {feedback ? (
          <p className="rounded-2xl bg-[var(--brand-orange-soft)] px-3 py-2 text-sm font-bold text-[var(--brand-navy)]" role="status">
            {feedback}
          </p>
        ) : null}
        <div className="safe-area-bottom grid grid-cols-2 gap-2 pt-1">
          <button
            className="inline-flex min-h-[52px] cursor-pointer items-center justify-center rounded-2xl border border-[rgba(10,37,64,0.12)] bg-white px-4 text-sm font-extrabold text-[var(--brand-navy)] transition-colors hover:bg-[var(--brand-orange-soft)]"
            onClick={onBack}
            type="button"
          >
            Geri
          </button>
          <button
            className="inline-flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[var(--brand-orange)] px-4 text-sm font-extrabold text-white shadow-[var(--shadow-action)] transition-colors hover:bg-[var(--brand-orange-dark)] disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            <Send aria-hidden className="size-4" />
            Gönder
          </button>
        </div>
      </form>
    </section>
  );
}

export function FuwuAssistantWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<WidgetView>("menu");
  const [supportDraft, setSupportDraft] = useState<SupportDraft>({});
  const hasMobileContactBar = /^\/providers\/[^/]+/.test(pathname ?? "");

  function closeWidget() {
    setIsOpen(false);
    window.setTimeout(() => setView("menu"), 180);
  }

  function openEmail(draft: SupportDraft = {}) {
    setSupportDraft(draft);
    setView("email");
  }

  return (
    <>
      {isOpen ? (
        <button
          aria-label="Destek paneli arka planını kapat"
          className="fixed inset-0 z-40 cursor-default bg-[rgba(10,37,64,0.26)] sm:hidden"
          onClick={closeWidget}
          type="button"
        />
      ) : null}

      <div
        className={cn(
          "fixed right-4 z-50 flex max-w-[calc(100vw-2rem)] flex-col items-end md:bottom-5 md:right-5",
          hasMobileContactBar
            ? "bottom-[calc(var(--mobile-bottom-nav-height)+var(--safe-bottom)+5.75rem)] md:bottom-[calc(5.75rem+var(--safe-bottom))] lg:bottom-[calc(1rem+var(--safe-bottom))]"
            : "bottom-[calc(var(--mobile-bottom-nav-height)+var(--safe-bottom)+1rem)] md:bottom-5",
          isOpen ? "z-[70]" : "",
          isOpen && view !== "menu" ? "inset-x-0 bottom-0 max-w-none items-stretch md:inset-auto md:w-[min(480px,calc(100vw-2rem))]" : "",
        )}
      >
        {isOpen ? (
          view === "assistant" ? (
            <FuwuAssistantPanel
              onClose={closeWidget}
              onEmailRequest={(draft) => openEmail(draft)}
            />
          ) : view === "email" ? (
            <SupportEmailForm
              key={`${supportDraft.imageReference ?? "no-image"}:${supportDraft.analysisSummary ?? "no-summary"}`}
              draft={supportDraft}
              onBack={() => setView("menu")}
              onClose={closeWidget}
            />
          ) : (
            <section className="mb-3 w-[min(calc(100vw-2rem),370px)] rounded-[24px] border border-[rgba(10,37,64,0.1)] bg-white p-4 shadow-[0_24px_70px_rgba(10,37,64,0.18)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-navy)] text-white">
                      <Bot aria-hidden className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-[var(--brand-navy)]">Fuwu Akıllı Asistan</p>
                      <p className="mt-0.5 text-xs font-extrabold text-[var(--brand-orange)]">Yapay zeka destekli</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm font-semibold leading-6 text-[var(--muted)]">
                    Sorunu anlat veya fotoğrafını yükle. İlk değerlendirmeyi yapalım, gerekiyorsa sana en uygun ustayı bulalım.
                  </p>
                </div>
                <button
                  aria-label="Destek panelini kapat"
                  className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl bg-[var(--surface-soft)] text-[var(--brand-navy)] transition-colors hover:bg-[var(--brand-orange-soft)]"
                  onClick={closeWidget}
                  type="button"
                >
                  <X aria-hidden className="size-5" />
                </button>
              </div>
              <div className="mt-4 grid gap-2">
                <button
                  className="inline-flex min-h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[var(--brand-orange)] px-4 text-sm font-extrabold text-white shadow-[var(--shadow-action)] transition-colors hover:bg-[var(--brand-orange-dark)]"
                  onClick={() => setView("assistant")}
                  type="button"
                >
                  <Sparkles aria-hidden className="size-4" />
                  Akıllı Asistanı Aç
                </button>
                <button
                  className="inline-flex min-h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[rgba(10,37,64,0.12)] bg-white px-4 text-sm font-extrabold text-[var(--brand-navy)] transition-colors hover:bg-[var(--brand-orange-soft)]"
                  onClick={() => openEmail({})}
                  type="button"
                >
                  <Mail aria-hidden className="size-4" />
                  E-posta Gönder
                </button>
              </div>
            </section>
          )
        ) : null}

        {!isOpen ? (
          <button
            aria-label="Fuwu Akıllı Asistan destek panelini aç"
            aria-expanded={isOpen}
            className="inline-flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-full bg-[var(--brand-navy)] px-4 text-white shadow-[var(--shadow-elevated)] transition-all hover:-translate-y-0.5 hover:bg-[var(--brand-navy-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
            onClick={() => setIsOpen(true)}
            type="button"
          >
            <LifeBuoy aria-hidden className="size-5" />
            <span className="hidden text-sm font-extrabold sm:inline">Destek</span>
          </button>
        ) : null}
      </div>
    </>
  );
}
