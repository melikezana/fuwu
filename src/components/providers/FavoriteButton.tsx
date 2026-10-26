"use client";

import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { buildLoginRedirectUrl } from "@/lib/constants/navigation";

type Favorites = { ids: string[]; authenticated: boolean; available: boolean };
let cached: Promise<Favorites> | null = null;
function loadFavorites() {
  cached ??= fetch("/api/account/favorites", { cache: "no-store" }).then(async response => {
    const body = await response.json();
    return { ids: body.ids || [], authenticated: response.status !== 401, available: response.ok };
  }).catch(() => ({ ids: [], authenticated: true, available: false }));
  return cached;
}

export function FavoriteButton({ providerId, providerName }: { providerId: string; providerName: string }) {
  const [state, setState] = useState<Favorites | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const saved = Boolean(state?.ids.includes(providerId));
  useEffect(() => {
    let mounted = true;
    const update = () => { void loadFavorites().then(value => { if (mounted) setState(value); }); };
    update(); window.addEventListener("fuwu:favorites-updated", update);
    return () => { mounted = false; window.removeEventListener("fuwu:favorites-updated", update); };
  }, []);
  async function toggle() {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/account/favorites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ providerId, saved: !saved }) });
      if (response.status === 401) {
        router.push(buildLoginRedirectUrl(`${pathname}${params.size ? `?${params}` : ""}`)); return;
      }
      if (!response.ok) throw new Error("unavailable");
      cached = null;
      await loadFavorites();
      window.dispatchEvent(new Event("fuwu:favorites-updated"));
      setMessage(saved ? "Favorilerinden kaldırıldı." : "Favorilerine eklendi.");
      router.refresh();
    } catch { setMessage("Favorilerin güncellenemedi. Biraz sonra yeniden dene."); }
    finally { setBusy(false); }
  }
  return <div className="favorite-control"><button className="favorite-button" type="button" disabled={busy || !state} aria-pressed={saved} aria-label={`${providerName} ${saved ? "favorilerimden çıkar" : "favorilerime ekle"}`} onClick={toggle}><Heart size={20} fill={saved ? "currentColor" : "none"} aria-hidden /></button>{message && <p role="status" className="favorite-feedback">{message}</p>}</div>;
}
