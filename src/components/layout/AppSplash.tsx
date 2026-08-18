"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FuwuLogo } from "@/components/brand/FuwuLogo";

const SPLASH_SESSION_KEY = "fuwu_splash_shown";

export function AppSplash() {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let hideTimer: NodeJS.Timeout | null = null;
    const timerId = window.setTimeout(() => {
      setMounted(true);
      if (typeof window !== "undefined") {
        const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
        const hasBeenShown = sessionStorage.getItem(SPLASH_SESSION_KEY);
        if (isStandalone && !hasBeenShown) {
          sessionStorage.setItem(SPLASH_SESSION_KEY, "true");
          setIsVisible(true);
          hideTimer = setTimeout(() => {
            setIsVisible(false);
          }, 1100);
        }
      }
    }, 0);

    return () => {
      clearTimeout(timerId);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="fuwu-app-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[var(--brand-orange)] text-white select-none px-6"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex flex-col items-center text-center gap-3"
          >
            <FuwuLogo inverted size="hero" />
            <p className="mt-3 text-lg font-semibold tracking-wide text-white/95 sm:text-xl">
              Artık komşuya değil, FUWU&apos;ya sor.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
