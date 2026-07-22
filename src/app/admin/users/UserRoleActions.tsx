"use client";

import { useState, useTransition } from "react";
import type { ProfileRole } from "@/types/auth";
import { changeUserRoleAction } from "./actions";

const roleOptions: Array<{ label: string; value: ProfileRole }> = [
  { label: "Müşteri", value: "customer" },
  { label: "Usta", value: "provider" },
  { label: "Admin", value: "admin" },
];

type UserRoleActionsProps = {
  currentRole: ProfileRole;
  isSelf: boolean;
  userId: string;
};

export function UserRoleActions({
  currentRole,
  isSelf,
  userId,
}: UserRoleActionsProps) {
  const [role, setRole] = useState<ProfileRole>(currentRole);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  if (isSelf) {
    return (
      <span className="text-xs font-semibold text-[var(--muted)]">
        Kendi hesabın
      </span>
    );
  }

  function handleSave() {
    setFeedback(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("userId", userId);
      formData.set("role", role);
      const result = await changeUserRoleAction(formData);
      setFeedback({ ok: result.ok, text: result.message });
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Kullanıcı rolü"
        className="rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-sm font-semibold text-[var(--brand-navy)] disabled:opacity-60"
        disabled={pending}
        onChange={(event) => setRole(event.target.value as ProfileRole)}
        value={role}
      >
        {roleOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <button
        className="rounded-md bg-[var(--brand-orange)] px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-orange-dark)] disabled:cursor-not-allowed disabled:opacity-50"
        disabled={pending || role === currentRole}
        onClick={handleSave}
        type="button"
      >
        {pending ? "Kaydediliyor…" : "Kaydet"}
      </button>

      {feedback ? (
        <span
          className={
            feedback.ok
              ? "text-xs font-semibold text-green-600"
              : "text-xs font-semibold text-red-600"
          }
          role="status"
        >
          {feedback.text}
        </span>
      ) : null}
    </div>
  );
}
