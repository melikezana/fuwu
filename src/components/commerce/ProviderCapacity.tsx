"use client";
import { useState } from "react";

export function ProviderCapacity({ providerId, initialLimit }: { providerId: string; initialLimit: number | null }) {
  const [limit, setLimit] = useState(String(initialLimit ?? 5));
  const [savedLimit, setSavedLimit] = useState(initialLimit);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  return <form className="commerce-panel mb-6" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setMessage(""); setFailed(false);
    try {
      const response = await fetch("/api/commerce/store/capacity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ providerId, limit: Number(limit) }) });
      if (!response.ok) throw new Error("Günlük sınır kaydedilemedi. Bağlantını ve kurulum durumunu kontrol et.");
      setSavedLimit(Number(limit));
      setMessage("Günlük sipariş sınırın kaydedildi. Mevcut siparişlerin korunur.");
    } catch (error) { setFailed(true); setMessage(error instanceof Error ? error.message : "Kaydedilemedi."); } finally { setBusy(false); }
  }}><h2>Günlük iş sınırın</h2><p className="commerce-help">{savedLimit == null ? "Henüz günlük adet sınırı belirlenmedi. " : ""}Saatlerin boş olsa da bu sayıya ulaştığında yeni randevu açılmaz. Ödeme için ayrılan randevular da sayılır.</p><label className="commerce-field">Bir günde en fazla kaç sipariş alabilirsin?<input required disabled={busy} type="number" min={1} max={30} step={1} value={limit} onChange={event => setLimit(event.target.value)} /></label><button className="commerce-secondary" disabled={busy}>{busy ? "Kaydediliyor…" : "Günlük Sınırı Kaydet"}</button>{message && <p role={failed ? "alert" : "status"} className="commerce-help">{message}</p>}</form>;
}
