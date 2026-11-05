"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Send } from "lucide-react";

const topics = [
  "Hizmet ve satın alma",
  "Siparişimle ilgili sorun",
  "Usta başvurusu",
  "Hesap ve giriş",
  "KVKK / kişisel veri talebi",
  "İş birliği ve basın",
  "Diğer",
] as const;

type Status = { kind: "idle" | "sending" | "sent" | "error"; message?: string };

export function ContactForm({ defaultEmail = "", defaultTopic }: { defaultEmail?: string; defaultTopic?: string }) {
  const initialTopic = topics.find(topic => topic === defaultTopic) ?? topics[0];
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const topic = String(data.get("topic") ?? "");
    const title = String(data.get("title") ?? "").trim();

    setStatus({ kind: "sending" });
    try {
      const response = await fetch("/api/support/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: title ? `${topic} · ${title}` : topic,
          email: String(data.get("email") ?? ""),
          message: String(data.get("message") ?? ""),
        }),
      });
      const result = (await response.json().catch(() => null)) as { message?: string; ok?: boolean } | null;
      if (!response.ok || !result?.ok) {
        setStatus({ kind: "error", message: result?.message ?? "Mesajın gönderilemedi. Lütfen biraz sonra tekrar dene." });
        return;
      }
      form.reset();
      setStatus({ kind: "sent", message: result.message ?? "Mesajın FUWU Destek ekibine iletildi." });
    } catch {
      setStatus({ kind: "error", message: "Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene." });
    }
  }

  if (status.kind === "sent") {
    return (
      <div className="commerce-notice" role="status">
        <p className="flex items-center gap-2 font-semibold"><CheckCircle2 aria-hidden size={18} /> {status.message}</p>
        <p className="commerce-help mt-2">Yanıtımızı yazdığın e-posta adresine göndereceğiz.</p>
        <button className="commerce-secondary mt-4" onClick={() => setStatus({ kind: "idle" })} type="button">Yeni mesaj yaz</button>
      </div>
    );
  }

  const busy = status.kind === "sending";
  return (
    <form aria-busy={busy} className="fusion-form" onSubmit={handleSubmit}>
      <label className="commerce-field">Konu
        <select defaultValue={initialTopic} disabled={busy} name="topic" required>
          {topics.map(topic => <option key={topic} value={topic}>{topic}</option>)}
        </select>
      </label>
      <label className="commerce-field">Başlık (isteğe bağlı)
        <input disabled={busy} maxLength={100} name="title" placeholder="Örneğin: Sipariş #1a2b3c4d" />
      </label>
      <label className="commerce-field">E-posta adresin
        <input autoComplete="email" defaultValue={defaultEmail} disabled={busy} inputMode="email" maxLength={254} name="email" required type="email" />
      </label>
      <label className="commerce-field">Mesajın
        <textarea disabled={busy} maxLength={2000} minLength={10} name="message" required rows={6} />
      </label>
      <p className="commerce-help">Kimlik numarası, kart bilgisi veya şifre yazma. Mesajın yalnızca destek ekibi tarafından okunur.</p>
      {status.kind === "error" && <p className="commerce-error" role="alert">{status.message}</p>}
      <button className="commerce-button" disabled={busy} type="submit"><Send aria-hidden size={16} /> {busy ? "Gönderiliyor…" : "Mesajı Gönder"}</button>
    </form>
  );
}
