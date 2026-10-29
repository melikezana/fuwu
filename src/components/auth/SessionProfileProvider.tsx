"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { CurrentUserProfile } from "@/types/auth";
const Context = createContext<{ profile: CurrentUserProfile | null; loading: boolean }>({ profile: null, loading: true });
export function SessionProfileProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [state, setState] = useState<{ profile: CurrentUserProfile | null; loading: boolean }>({ profile: null, loading: true });
  useEffect(() => {
    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    let pending: Promise<void> | undefined;
    const controller = new AbortController();
    function refresh(): Promise<void> {
      if (pending) return pending;
      pending = (async () => {
        try {
          const response = await fetch("/api/auth/user", { cache: "no-store", signal: controller.signal });
          const body = response.ok ? await response.json() : null;
          const profile = body?.authenticated && body.profile ? body.profile : null;
          if (disposed) return;
          setState({ profile, loading: false });
          // Anonymous discovery does not need the Auth/Realtime SDK. Signed-in sessions
          // still receive token, user update and logout events from the actual SDK.
          if (profile && !unsubscribe) {
            try {
              const { createClient } = await import("@/lib/supabase/client");
              if (disposed) return;
              const subscription = createClient()?.auth.onAuthStateChange(event => {
                if (event === "SIGNED_OUT") setState({ profile: null, loading: false });
                else if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "TOKEN_REFRESHED") void refresh();
              }).data.subscription;
              unsubscribe = () => subscription?.unsubscribe();
            } catch { /* Keep the server-verified profile; focus/storage/navigation retry. */ }
          }
        } catch { if (!disposed) setState({ profile: null, loading: false }); }
        finally { pending = undefined; }
      })();
      return pending;
    }
    const onStorage = (event: StorageEvent) => { if (event.key?.startsWith("sb-")) void refresh(); };
    const onFocus = () => { void refresh(); };
    void refresh();
    window.addEventListener("storage", onStorage); window.addEventListener("focus", onFocus);
    return () => { disposed = true; controller.abort(); unsubscribe?.(); window.removeEventListener("storage", onStorage); window.removeEventListener("focus", onFocus); };
  }, [pathname]);
  return <Context.Provider value={state}>{children}</Context.Provider>;
}
export function useSessionProfile() { return useContext(Context); }
