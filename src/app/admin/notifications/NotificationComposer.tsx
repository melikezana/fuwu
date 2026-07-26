"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { sendNotificationAction } from "./actions";

type UserOption = { id: string; name: string };

const targetOptions = [
  { label: "Tek kullanıcı", value: "user" },
  { label: "Tüm müşteriler", value: "customers" },
  { label: "Tüm ustalar", value: "providers" },
  { label: "Herkes", value: "all" },
];

export function NotificationComposer({ users }: { users: UserOption[] }) {
  const [target, setTarget] = useState("user");
  const [userId, setUserId] = useState(users[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSend() {
    setFeedback(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("target", target);
      formData.set("userId", userId);
      formData.set("title", title);
      formData.set("body", body);
      const result = await sendNotificationAction(formData);
      setFeedback({ ok: result.ok, text: result.message });
      if (result.ok) {
        setTitle("");
        setBody("");
      }
    });
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)]">
      <h2 className="mb-4 text-lg font-bold text-[var(--brand-navy)]">Yeni Bildirim</h2>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="flex-1 text-sm font-semibold text-[var(--brand-navy)]">
            Hedef
            <select
              className="mt-1.5 block w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--brand-navy)]"
              disabled={pending}
              onChange={(event) => setTarget(event.target.value)}
              value={target}
            >
              {targetOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {target === "user" ? (
            <label className="flex-1 text-sm font-semibold text-[var(--brand-navy)]">
              Kullanıcı
              <select
                className="mt-1.5 block w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--brand-navy)]"
                disabled={pending}
                onChange={(event) => setUserId(event.target.value)}
                value={userId}
              >
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <label className="text-sm font-semibold text-[var(--brand-navy)]">
          Başlık
          <input
            className="mt-1.5 block w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm text-[var(--brand-navy)] outline-none"
            disabled={pending}
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Örn. Yeni özellik duyurusu"
            value={title}
          />
        </label>

        <label className="text-sm font-semibold text-[var(--brand-navy)]">
          Mesaj
          <textarea
            className="mt-1.5 block h-28 w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm text-[var(--brand-navy)] outline-none"
            disabled={pending}
            maxLength={1000}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Bildirim metni…"
            value={body}
          />
        </label>

        <div className="flex items-center gap-3">
          <button
            className="inline-flex items-center gap-2 rounded-md bg-[var(--brand-orange)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-orange-dark)] disabled:opacity-50"
            disabled={pending || !title.trim() || !body.trim() || (target === "user" && !userId)}
            onClick={handleSend}
            type="button"
          >
            <Send className="h-4 w-4" aria-hidden />
            {pending ? "Gönderiliyor…" : "Gönder"}
          </button>
          {feedback ? (
            <span
              className={
                feedback.ok
                  ? "text-sm font-semibold text-green-600"
                  : "text-sm font-semibold text-red-600"
              }
              role="status"
            >
              {feedback.text}
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}
