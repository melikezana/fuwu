"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

// Per-tab drafts expire after 30 minutes. Never persist upload paths or file objects.
export function useSessionFormDraft<T extends object>(
  key: string,
  form: T,
  setForm: Dispatch<SetStateAction<T>>,
) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = sessionStorage.getItem(key);
        if (raw) {
          const draft = JSON.parse(raw);
          if (draft.updatedAt > Date.now() - 30 * 60_000 && draft.form && typeof draft.form === "object") {
            setForm(current => ({ ...current, ...Object.fromEntries(Object.entries(draft.form).filter(([field, value]) => Object.hasOwn(current, field) && typeof value === "string" && value.length <= 4000 && !/^(profileImage|verificationDocument)/i.test(field))) }));
          } else sessionStorage.removeItem(key);
        }
      } catch { /* Storage may be unavailable in private browsing. */ }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [key, setForm]);

  useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem(key, JSON.stringify({ updatedAt: Date.now(), form: Object.fromEntries(Object.entries(form).filter(([field]) => !/^(profileImage|verificationDocument)/i.test(field))) }));
    } catch { /* The form remains usable when browser storage is unavailable. */ }
  }, [form, key, ready]);

  return () => { try { sessionStorage.removeItem(key); } catch { /* Optional storage. */ } };
}
