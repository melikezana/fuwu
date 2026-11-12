"use client";

import { Bot, Loader2, Mail, Mic, RotateCcw, Send, Sparkles, Square, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AssistantAnalysis,
  AssistantAnalyzeResponse,
  RecommendedProvider,
} from "@/lib/ai/assistant-schema";
import { serviceCategories } from "@/lib/constants/services";
import { buildJobBrief } from "@/lib/ai/job-brief";
import { useSpeechDictation } from "@/lib/hooks/useSpeechDictation";
import { cn } from "@/lib/utils";
import { AnalysisResult } from "./AnalysisResult";
import { ImageUploader, type AssistantImageFile } from "./ImageUploader";
import { RecommendedProviders } from "./RecommendedProviders";
import { RecommendedServices } from "./RecommendedServices";
import type { RecommendedService } from "@/lib/ai/service-recommendations";

type FuwuAssistantPanelProps = {
  onClose: () => void;
  onEmailRequest: (draft: { analysisSummary?: string; imageReference?: string | null }) => void;
};

type ConversationMessage = {
  content: string;
  role: "assistant" | "user";
};

const quickOptions = [
  "Su kaçağı var",
  "Elektrik arızası",
  "Cihaz çalışmıyor",
  "Kapıda kaldım",
  "Temizlik hizmeti arıyorum",
  "Fotoğrafla incele",
] as const;

function sendAnalysisRequest(
  formData: FormData,
  onProgress: (progress: number) => void,
) {
  return new Promise<AssistantAnalyzeResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("POST", "/api/ai-assistant/analyze");
    xhr.responseType = "text";
    xhr.timeout = 45_000;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.min(70, Math.round((event.loaded / event.total) * 70)));
      }
    };
    xhr.onload = () => {
      let payload: unknown = null;

      try {
        payload = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        payload = null;
      }

      if (xhr.status >= 200 && xhr.status < 300 && payload) {
        onProgress(100);
        resolve(payload as AssistantAnalyzeResponse);
        return;
      }

      const message =
        payload &&
        typeof payload === "object" &&
        "message" in payload &&
        typeof payload.message === "string"
          ? payload.message
          : "İlk değerlendirme şu anda hazırlanamadı. Lütfen tekrar dene.";

      reject(new Error(message));
    };
    xhr.onerror = () => reject(new Error("Bağlantı kurulamadı. Lütfen tekrar dene."));
    xhr.ontimeout = () => reject(new Error("Analiz beklenenden uzun sürdü. Lütfen tekrar dene."));
    xhr.send(formData);
  });
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-3 rounded-[24px] border border-[rgba(10,37,64,0.08)] bg-white p-4 shadow-[var(--shadow-subtle)]">
      <div className="h-4 w-36 animate-pulse rounded-full bg-[var(--brand-navy-soft)]" />
      <div className="h-20 animate-pulse rounded-3xl bg-[var(--surface-soft)]" />
      <div className="grid grid-cols-2 gap-2">
        <div className="h-12 animate-pulse rounded-2xl bg-[var(--surface-soft)]" />
        <div className="h-12 animate-pulse rounded-2xl bg-[var(--surface-soft)]" />
      </div>
    </div>
  );
}

export function FuwuAssistantPanel({ onClose, onEmailRequest }: FuwuAssistantPanelProps) {
  const [message, setMessage] = useState("");
  const [district, setDistrict] = useState("");
  const [category, setCategory] = useState("");
  const [image, setImageState] = useState<AssistantImageFile | null>(null);
  const [history, setHistory] = useState<ConversationMessage[]>([]);
  const [analysis, setAnalysis] = useState<AssistantAnalysis | null>(null);
  const [providers, setProviders] = useState<RecommendedProvider[]>([]);
  const [services, setServices] = useState<RecommendedService[]>([]);
  const [degraded, setDegraded] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [imageReference, setImageReference] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysisContext, setAnalysisContext] = useState<{ district: string; hasPhoto: boolean }>({ district: "", hasPhoto: false });
  const resultRef = useRef<HTMLDivElement | null>(null);
  const messageRef = useRef<HTMLTextAreaElement | null>(null);
  const appendDictation = useCallback((text: string) => {
    setMessage((current) => `${current}${current && !/\s$/.test(current) ? " " : ""}${text}`.slice(0, 2000));
  }, []);
  const dictation = useSpeechDictation(appendDictation);
  const uploadButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    return () => {
      if (image?.previewUrl) {
        URL.revokeObjectURL(image.previewUrl);
      }
    };
  }, [image]);

  const assistantSummary = useMemo(() => {
    if (!analysis) {
      return "";
    }

    return [
      `Olası sorun: ${analysis.likelyIssue}`,
      `Önerilen hizmet: ${analysis.category}`,
      `Aciliyet: ${analysis.urgency}`,
      `İlk değerlendirme: ${analysis.summary}`,
    ].join("\n");
  }, [analysis]);

  // Ustanın tek bakışta anlayacağı iş özeti; müşterinin kendi cümlelerinden ve değerlendirmeden derlenir.
  const jobBrief = useMemo(
    () =>
      analysis
        ? buildJobBrief({
            analysis,
            customerMessages: history.filter((item) => item.role === "user").map((item) => item.content),
            district: analysisContext.district,
            hasPhoto: analysisContext.hasPhoto,
          })
        : null,
    [analysis, analysisContext, history],
  );

  function answerFollowUp(question: string) {
    setMessage((current) => (current.trim() ? current : `${question} `));
    messageRef.current?.focus();
  }

  function setImage(nextImage: AssistantImageFile | null) {
    setImageState((currentImage) => {
      if (currentImage?.previewUrl && currentImage.previewUrl !== nextImage?.previewUrl) {
        URL.revokeObjectURL(currentImage.previewUrl);
      }

      return nextImage;
    });
  }

  function resetConversation() {
    setMessage("");
    setDistrict("");
    setCategory("");
    setImage(null);
    setHistory([]);
    setAnalysis(null);
    setProviders([]);
    setServices([]);
    setDegraded(false);
    setConversationId(null);
    setImageReference(null);
    setAnalysisContext({ district: "", hasPhoto: false });
    setError(null);
    setProgress(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedMessage = message.trim();

    if (!trimmedMessage && !image) {
      setError("Sorunu birkaç cümleyle anlat veya fotoğraf yükle.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    setProgress(8);

    const formData = new FormData();

    formData.append("message", trimmedMessage);
    formData.append("district", district.trim());
    formData.append("category", category);
    formData.append("history", JSON.stringify(history.slice(-6)));

    if (conversationId) {
      formData.append("conversationId", conversationId);
    }

    if (image) {
      formData.append("image", image.file, image.file.name);
    }

    try {
      const response = await sendAnalysisRequest(formData, setProgress);

      setAnalysis(response.analysis);
      setProviders(response.providers);
      setServices(response.services ?? []);
      setDegraded(Boolean(response.degraded));
      setConversationId(response.conversationId ?? conversationId);
      setImageReference(response.imageReference);
      setAnalysisContext((current) => ({ district: district.trim(), hasPhoto: current.hasPhoto || Boolean(image) }));
      setHistory((currentHistory) =>
        [
          ...currentHistory,
          trimmedMessage ? { content: trimmedMessage, role: "user" as const } : null,
          { content: response.analysis.summary, role: "assistant" as const },
        ].filter((item): item is ConversationMessage => Boolean(item)).slice(-8),
      );
      setMessage("");
      window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Analiz hazırlanamadı.");
    } finally {
      setIsSubmitting(false);
      window.setTimeout(() => setProgress(null), 400);
    }
  }

  function handleQuickOption(option: string) {
    if (option === "Fotoğrafla incele") {
      setMessage((currentMessage) => currentMessage || "Fotoğrafla incele");
      uploadButtonRef.current?.click();
      return;
    }

    setMessage(option);
  }

  return (
    <section
      aria-label="FUWU Akıllı Asistan"
      className="flex h-full max-h-[calc(100dvh-env(safe-area-inset-bottom)-0.5rem)] flex-col overflow-hidden rounded-t-[24px] border border-[rgba(10,37,64,0.12)] bg-[#fbfcfe] shadow-[0_28px_80px_rgba(10,37,64,0.22)] sm:h-[min(760px,calc(100vh-7rem))] sm:rounded-[24px]"
    >
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[rgba(10,37,64,0.08)] bg-white px-4 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-navy)] text-white shadow-[var(--shadow-subtle)]">
            <Bot aria-hidden className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-extrabold text-[var(--brand-navy)]">FUWU Akıllı Asistan</h2>
              <span className="rounded-full bg-[var(--brand-orange-soft)] px-2.5 py-1 text-[11px] font-extrabold text-[var(--brand-orange)]">
                Yapay zeka destekli
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold leading-5 text-[var(--muted)]">
              Sorunu göster, doğru çözümü birlikte bulalım.
            </p>
          </div>
        </div>
        <button
          aria-label="Akıllı Asistan panelini kapat"
          className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl bg-[var(--surface-soft)] text-[var(--brand-navy)] transition-colors hover:bg-[var(--brand-orange-soft)]"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden className="size-5" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="grid gap-4">
          <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-[var(--brand-orange-soft)] text-[var(--brand-orange)]">
              <Sparkles aria-hidden className="size-5" />
            </span>
            <div className="rounded-[22px] rounded-tl-md bg-white p-4 text-sm font-semibold leading-6 text-[var(--brand-navy)] shadow-[var(--shadow-subtle)]">
              Merhaba, ben FUWU Akıllı Asistan. Sorunu birkaç cümleyle anlatabilir veya fotoğrafını yükleyebilirsin. Önce durumu değerlendirecek, ardından en güvenli ve pratik yolu önereceğim.
            </div>
          </div>

          <div className="flex flex-wrap gap-2" aria-label="Hızlı seçenekler">
            {quickOptions.map((option) => (
              <button
                className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-[rgba(10,37,64,0.1)] bg-white px-3 text-xs font-extrabold text-[var(--brand-navy)] shadow-[var(--shadow-subtle)] transition-colors hover:border-[rgba(255,101,0,0.28)] hover:bg-[var(--brand-orange-soft)]"
                key={option}
                onClick={() => handleQuickOption(option)}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-extrabold text-[var(--brand-navy)]">
              İlçe
              <input
                className="premium-control h-11 rounded-2xl px-3 text-sm font-semibold"
                onChange={(event) => setDistrict(event.target.value)}
                placeholder="Örn. Kadıköy"
                value={district}
              />
            </label>
            <label className="grid gap-1 text-xs font-extrabold text-[var(--brand-navy)]">
              Kategori
              <select
                className="premium-control h-11 rounded-2xl px-3 text-sm font-semibold"
                onChange={(event) => setCategory(event.target.value)}
                value={category}
              >
                <option value="">Asistan seçsin</option>
                {serviceCategories.map((service) => (
                  <option key={service.id} value={service.slug}>
                    {service.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <ImageUploader
            image={image}
            isUploading={isSubmitting}
            onImageChange={setImage}
            progress={progress}
          />

          <button
            className="sr-only"
            onClick={() => document.querySelector<HTMLInputElement>('input[accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"]')?.click()}
            ref={uploadButtonRef}
            type="button"
          >
            Fotoğraf yükle
          </button>

          {error ? (
            <p className="rounded-3xl bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          {isSubmitting ? <LoadingSkeleton /> : null}

          <div ref={resultRef} className="grid gap-4">
            {analysis && degraded ? (
              <p className="rounded-2xl bg-[var(--surface-soft)] px-3 py-2 text-xs font-bold leading-5 text-[var(--muted)]" role="status">
                Hızlı değerlendirme: yapay zekâ şu an yoğun, anlattıklarına göre yönlendirdim. Ayrıntılı inceleme için destek ekibine de yazabilirsin.
              </p>
            ) : null}
            {analysis ? (
              <AnalysisResult
                analysis={analysis}
                hasProviders={providers.length > 0 || services.length > 0}
                jobBrief={jobBrief}
                onAnswerFollowUp={answerFollowUp}
                onAskMore={() => { setMessage(""); messageRef.current?.focus(); }}
                onEmailSupport={() =>
                  onEmailRequest({
                    analysisSummary: jobBrief ? `${assistantSummary}\n\n${jobBrief.text}` : assistantSummary,
                    imageReference,
                  })
                }
                onFindProviders={() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })}
                onNewPhoto={() => {
                  setImage(null);
                  setMessage("Yeni fotoğrafı incele");
                }}
              />
            ) : null}
            <RecommendedProviders
              context={analysis ? { category: analysis.category, district: analysisContext.district, urgency: analysis.urgency } : null}
              providers={providers}
            />
            <RecommendedServices services={services} />
          </div>
        </div>
      </div>

      <form
        className="safe-area-bottom sticky bottom-0 grid shrink-0 gap-3 border-t border-[rgba(10,37,64,0.08)] bg-white px-4 py-3"
        onSubmit={handleSubmit}
      >
        <label className="sr-only" htmlFor="fuwuAssistantMessage">
          Sorunu anlat
        </label>
        <textarea
          className="premium-control min-h-24 resize-none rounded-[22px] px-4 py-3 text-sm font-semibold leading-6"
          disabled={isSubmitting}
          id="fuwuAssistantMessage"
          maxLength={2000}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={dictation.listening ? "Dinliyorum, sorunu anlat..." : "Sorunu birkaç cümleyle anlat..."}
          ref={messageRef}
          value={message}
        />
        {dictation.error ? (
          <p className="text-xs font-bold leading-5 text-red-700" role="alert">{dictation.error}</p>
        ) : null}
        <span aria-live="polite" className="sr-only">{dictation.listening ? "Mikrofon açık, dinleniyor." : ""}</span>
        <div className={cn("grid gap-2", dictation.supported ? "grid-cols-[1fr_auto_auto_auto]" : "grid-cols-[1fr_auto_auto]")}>
          <button
            className="inline-flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[rgba(10,37,64,0.12)] bg-white px-3 text-sm font-extrabold text-[var(--brand-navy)] transition-colors hover:bg-[var(--brand-orange-soft)]"
            onClick={resetConversation}
            type="button"
          >
            <RotateCcw aria-hidden className="size-4" />
            Yeni konuşma
          </button>
          {dictation.supported ? (
            <button
              aria-label={dictation.listening ? "Sesle yazmayı durdur" : "Sorunu sesle anlat"}
              aria-pressed={dictation.listening}
              className={cn(
                "inline-flex min-h-[52px] min-w-[52px] cursor-pointer items-center justify-center rounded-2xl border transition-colors disabled:opacity-60",
                dictation.listening
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-[rgba(10,37,64,0.12)] bg-white text-[var(--brand-navy)] hover:bg-[var(--brand-orange-soft)]",
              )}
              disabled={isSubmitting}
              onClick={dictation.listening ? dictation.stop : dictation.start}
              title={dictation.listening ? "Durdur" : "Sesle anlat"}
              type="button"
            >
              {dictation.listening ? <Square aria-hidden className="size-5" /> : <Mic aria-hidden className="size-5" />}
            </button>
          ) : null}
          <button
            className="inline-flex min-h-[52px] min-w-[52px] cursor-pointer items-center justify-center rounded-2xl bg-[var(--brand-navy)] text-white transition-colors hover:bg-[var(--brand-navy-deep)]"
            onClick={() =>
              onEmailRequest({
                analysisSummary: assistantSummary,
                imageReference,
              })
            }
            title="E-posta ile destek"
            type="button"
          >
            <Mail aria-hidden className="size-5" />
          </button>
          <button
            className={cn(
              "inline-flex min-h-[52px] min-w-[52px] cursor-pointer items-center justify-center rounded-2xl bg-[var(--brand-orange)] text-white shadow-[var(--shadow-action)] transition-colors hover:bg-[var(--brand-orange-dark)] disabled:opacity-60",
            )}
            disabled={isSubmitting}
            title="Gönder"
            type="submit"
          >
            {isSubmitting ? <Loader2 aria-hidden className="size-5 animate-spin" /> : <Send aria-hidden className="size-5" />}
          </button>
        </div>
      </form>
    </section>
  );
}
