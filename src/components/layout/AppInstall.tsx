"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const VISITS_KEY = "fuwu:visits";
const DISMISSED_KEY = "fuwu:install-dismissed-at";
const DISMISS_DAYS = 21;

function readNumber(key: string) {
  try { return Number(localStorage.getItem(key) ?? "0") || 0; } catch { return 0; }
}
function write(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* Optional storage. */ }
}

/** Service worker kaydı + mobilde "Ana ekrana ekle" önerisi (ikinci ziyaretten sonra, 21 günde bir). */
export function AppInstall() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
    }

    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    const visits = readNumber(VISITS_KEY) + 1;
    write(VISITS_KEY, String(visits));
    const dismissedAt = readNumber(DISMISSED_KEY);
    const recentlyDismissed = dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_DAYS * 86_400_000;
    if (standalone || !mobile || visits < 2 || recentlyDismissed) return;

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as InstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    const ua = navigator.userAgent;
    const isIosSafari = /iphone|ipad|ipod/i.test(ua) && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
    let timer: number | undefined;
    if (isIosSafari) timer = window.setTimeout(() => { setShowIos(true); setVisible(true); }, 4000);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  function dismiss() {
    write(DISMISSED_KEY, String(Date.now()));
    setVisible(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => undefined);
    setDeferred(null);
    dismiss();
  }

  if (!visible) return null;

  return (
    <div
      aria-live="polite"
      className="fixed inset-x-3 z-[60] rounded-2xl border border-[rgba(10,37,64,0.12)] bg-white p-3 shadow-[0_18px_50px_rgba(10,37,64,0.2)] md:hidden"
      role="dialog"
      aria-label="FUWU'yu ana ekrana ekle"
      style={{ bottom: "calc(var(--mobile-bottom-nav-height, 64px) + var(--safe-bottom, 0px) + 12px)" }}
    >
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="" className="size-11 shrink-0 rounded-xl" height={44} src="/icons/fuwu-icon-192.png" width={44} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-[var(--brand-navy)]">FUWU&apos;yu ana ekranına ekle</p>
          {showIos ? (
            <p className="mt-1 text-xs font-semibold leading-5 text-[var(--muted)]">
              Alttaki <Share aria-label="Paylaş" className="inline size-3.5 align-[-2px]" /> simgesine dokun, ardından “Ana Ekrana Ekle”yi seç.
            </p>
          ) : (
            <p className="mt-1 text-xs font-semibold leading-5 text-[var(--muted)]">Tek dokunuşla aç, siparişlerini uygulama gibi takip et.</p>
          )}
        </div>
        <button aria-label="Kapat" className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-soft)] text-[var(--brand-navy)]" onClick={dismiss} type="button">
          <X aria-hidden className="size-4" />
        </button>
      </div>
      {!showIos && deferred ? (
        <button className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-orange)] text-sm font-extrabold text-[#241c16]" onClick={() => void install()} type="button">
          <Download aria-hidden className="size-4" /> Ana ekrana ekle
        </button>
      ) : null}
    </div>
  );
}
