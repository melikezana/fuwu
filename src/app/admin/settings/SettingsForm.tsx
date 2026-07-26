"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import type { SettingDef } from "@/services/admin/settings";
import { saveSettingsAction } from "./actions";

type SettingsFormProps = {
  defs: SettingDef[];
  values: Record<string, string>;
};

export function SettingsForm({ defs, values }: SettingsFormProps) {
  const [state, setState] = useState<Record<string, string>>(values);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function setValue(key: string, value: string) {
    setState((previous) => ({ ...previous, [key]: value }));
  }

  function handleSave() {
    setFeedback(null);
    startTransition(async () => {
      const formData = new FormData();
      for (const def of defs) {
        formData.set(def.key, state[def.key] ?? def.default);
      }
      const result = await saveSettingsAction(formData);
      setFeedback({ ok: result.ok, text: result.message });
      if (result.ok && result.values) {
        setState(result.values);
      }
    });
  }

  return (
    <section className="max-w-2xl rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-5">
        {defs.map((def) => (
          <div key={def.key}>
            {def.type === "boolean" ? (
              <label className="flex items-center gap-3 text-sm font-semibold text-[var(--brand-navy)]">
                <input
                  checked={state[def.key] === "true"}
                  className="h-5 w-5 rounded border-[var(--border)]"
                  disabled={pending}
                  onChange={(event) => setValue(def.key, event.target.checked ? "true" : "false")}
                  type="checkbox"
                />
                {def.label}
              </label>
            ) : (
              <label className="block text-sm font-semibold text-[var(--brand-navy)]">
                {def.label}
                <input
                  className="mt-1.5 block w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm text-[var(--brand-navy)] outline-none"
                  disabled={pending}
                  inputMode={def.type === "number" ? "decimal" : undefined}
                  onChange={(event) => setValue(def.key, event.target.value)}
                  type={def.type === "number" ? "number" : "text"}
                  value={state[def.key] ?? ""}
                />
              </label>
            )}
          </div>
        ))}

        <div className="flex items-center gap-3">
          <button
            className="inline-flex items-center gap-2 rounded-md bg-[var(--brand-orange)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-orange-dark)] disabled:opacity-50"
            disabled={pending}
            onClick={handleSave}
            type="button"
          >
            <Save className="h-4 w-4" aria-hidden />
            {pending ? "Kaydediliyor…" : "Kaydet"}
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
