"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useHydrated } from "@/lib/useHydrated";

/**
 * Tarayıcının yerleşik konuşma tanımasıyla Türkçe dikte. Ses FUWU sunucularına gönderilmez;
 * tanıma tarayıcının kendi hizmetinde yapılır. Desteklemeyen tarayıcıda `supported` false kalır
 * ve arayüz mikrofon düğmesini hiç göstermez.
 */

type RecognitionResult = { readonly isFinal: boolean; readonly 0: { readonly transcript: string } };
type RecognitionEvent = { readonly resultIndex: number; readonly results: { readonly length: number; readonly [index: number]: RecognitionResult } };
type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  abort: () => void;
  start: () => void;
  stop: () => void;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult: ((event: RecognitionEvent) => void) | null;
};
type RecognitionConstructor = new () => Recognition;

function getConstructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const win = window as Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

export function dictationErrorMessage(code: string | undefined) {
  if (code === "not-allowed" || code === "service-not-allowed") return "Mikrofon izni verilmedi. Tarayıcı ayarlarından izin verebilir ya da yazarak anlatabilirsin.";
  if (code === "no-speech") return "Ses algılanmadı. Tekrar deneyebilir ya da yazarak anlatabilirsin.";
  if (code === "aborted") return null;
  return "Sesle yazma şu anda çalışmadı. Yazarak anlatabilirsin.";
}

export function useSpeechDictation(onFinalText: (text: string) => void) {
  // Sunucu çıktısıyla aynı kalması için destek bilgisi yalnızca tarayıcıda, hydration sonrasında okunur.
  const supported = useHydrated() && Boolean(getConstructor());
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<Recognition | null>(null);
  const onFinalRef = useRef(onFinalText);

  useEffect(() => { onFinalRef.current = onFinalText; }, [onFinalText]);
  useEffect(() => () => recognitionRef.current?.abort(), []);

  const stop = useCallback(() => { recognitionRef.current?.stop(); }, []);

  const start = useCallback(() => {
    const Constructor = getConstructor();
    if (!Constructor || recognitionRef.current) return;
    const recognition = new Constructor();
    recognition.lang = "tr-TR";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = event => {
      let text = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        if (event.results[index].isFinal) text += event.results[index][0].transcript;
      }
      if (text.trim()) onFinalRef.current(text.trim());
    };
    recognition.onerror = event => setError(dictationErrorMessage(event.error));
    recognition.onend = () => { recognitionRef.current = null; setListening(false); };
    recognitionRef.current = recognition;
    setError(null);
    try {
      recognition.start();
      setListening(true);
    } catch {
      recognitionRef.current = null;
      setError(dictationErrorMessage(undefined));
    }
  }, []);

  return { error, listening, start, stop, supported };
}
