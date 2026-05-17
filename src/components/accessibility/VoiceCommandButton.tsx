"use client";

import { Mic, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getKnownVoiceCommandExamples,
  interpretVoiceCommand,
  readProviderSummaries,
} from "@/lib/accessibility/voiceCommands";
import { appRoutes } from "@/lib/constants/navigation";
import { useI18n } from "@/lib/i18n";
import type { Provider } from "@/types/provider";

type VoiceCommandButtonProps = {
  categories?: string[];
  districts: string[];
  providers: Provider[];
};

type SpeechRecognitionResultLike = {
  readonly isFinal: boolean;
  readonly 0: {
    readonly transcript: string;
  };
};

type SpeechRecognitionEventLike = {
  readonly results: {
    readonly length: number;
    readonly [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  abort: () => void;
  start: () => void;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

function createProviderQuery(kind: "category" | "district", value: string) {
  const params = new URLSearchParams({ [kind]: value });

  return `${appRoutes.providers}?${params.toString()}`;
}

function focusFirstWhatsAppLink() {
  const link = document.querySelector<HTMLAnchorElement>("[data-provider-whatsapp='true']");

  if (!link) {
    return false;
  }

  link.focus();
  link.scrollIntoView({ block: "center", behavior: "smooth" });
  return true;
}

async function requestMicrophonePermission() {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return;
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach((track) => track.stop());
}

export function VoiceCommandButton({
  categories = [],
  districts,
  providers,
}: VoiceCommandButtonProps) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    t("voice.examples", { examples: getKnownVoiceCommandExamples().join(", ") }),
  );

  useEffect(() => {
    setStatusMessage(t("voice.examples", { examples: getKnownVoiceCommandExamples().join(", ") }));
  }, [locale, t]);

  function runReadout() {
    const result = readProviderSummaries(providers, {
      empty: t("voice.readEmpty"),
      reading: t("voice.reading"),
      readingLimited: t("voice.readingLimited"),
      unsupported: t("voice.readUnsupported"),
    });
    setStatusMessage(result.message);
  }

  function executeTranscript(transcript: string) {
    const command = interpretVoiceCommand(transcript, { categories, districts });

    if (command.type === "category") {
      setStatusMessage(t("voice.categoryOpening", { value: command.value }));
      router.push(createProviderQuery("category", command.value));
      return;
    }

    if (command.type === "district") {
      setStatusMessage(t("voice.districtOpening", { value: command.value }));
      router.push(createProviderQuery("district", command.value));
      return;
    }

    if (command.type === "show-providers") {
      setStatusMessage(t("voice.providersOpening"));
      router.push(appRoutes.providers);
      return;
    }

    if (command.type === "whatsapp") {
      const focused = focusFirstWhatsAppLink();
      setStatusMessage(
        focused
          ? t("voice.whatsappFocused")
          : t("voice.whatsappMissing"),
      );
      return;
    }

    if (command.type === "read-profiles") {
      runReadout();
      return;
    }

    setStatusMessage(t("voice.unknown"));
  }

  async function handleVoiceCommandClick() {
    const SpeechRecognition = getSpeechRecognitionConstructor();

    if (!SpeechRecognition) {
      setStatusMessage(t("voice.unsupported"));
      return;
    }

    try {
      setStatusMessage(t("voice.permissionRequest"));
      await requestMicrophonePermission();
    } catch {
      setStatusMessage(t("voice.permissionDenied"));
      return;
    }

    recognitionRef.current?.abort();

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "tr-TR";
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const lastResult = event.results[event.results.length - 1];
      const transcript = lastResult?.[0]?.transcript ?? "";
      executeTranscript(transcript);
    };
    recognition.onerror = () => {
      setStatusMessage(t("voice.error"));
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
    };

    setIsListening(true);
    setStatusMessage(t("voice.listeningStatus"));
    try {
      recognition.start();
    } catch {
      setIsListening(false);
      setStatusMessage(t("voice.startFailed"));
    }
  }

  return (
    <div className="mt-4 grid gap-3 rounded-lg border border-[rgba(13,20,36,0.08)] bg-[var(--surface-soft)] p-3 sm:grid-cols-[auto_auto_minmax(0,1fr)] sm:items-center">
      <button
        aria-label={t("voice.aria.start")}
        className={`inline-flex min-h-11 cursor-pointer select-none items-center justify-center gap-2 rounded-md px-4 text-sm font-black text-white shadow-[0_14px_32px_rgba(13,20,36,0.18)] transition-all hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2 ${
          isListening
            ? "bg-[var(--brand-orange)]"
            : "bg-[var(--brand-navy)] hover:bg-[var(--brand-navy-soft)] active:bg-[var(--brand-orange)]"
        }`}
        onClick={handleVoiceCommandClick}
        type="button"
      >
        <Mic aria-hidden="true" className="size-4" />
        {isListening ? t("voice.button.listening") : t("voice.button.start")}
      </button>
      <button
        aria-label={t("voice.aria.read")}
        className="inline-flex min-h-11 cursor-pointer select-none items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-black text-[var(--brand-navy)] shadow-[inset_0_0_0_1px_rgba(13,20,36,0.12)] transition-all hover:-translate-y-0.5 hover:bg-[var(--brand-orange-soft)] active:bg-[var(--brand-orange)] active:text-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
        onClick={runReadout}
        type="button"
      >
        <Volume2 aria-hidden="true" className="size-4" />
        {t("voice.button.read")}
      </button>
      <p aria-live="polite" className="cursor-default select-none text-sm font-semibold leading-6 text-[var(--muted)]">
        {statusMessage}
      </p>
    </div>
  );
}
