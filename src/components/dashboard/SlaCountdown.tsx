"use client";

import { useEffect, useMemo, useState } from "react";
import { EMERGENCY_RESPONSE_SLA_MINUTES } from "@/lib/constants/sla";

export type SlaCountdownProps = {
  assignedAt: string;
};

const slaDurationMs = EMERGENCY_RESPONSE_SLA_MINUTES * 60 * 1000;

function getRemainingMs(deadlineMs: number) {
  return deadlineMs - Date.now();
}

function formatRemainingTime(remainingMs: number) {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function SlaCountdown({ assignedAt }: SlaCountdownProps) {
  const assignedAtMs = useMemo(() => Date.parse(assignedAt), [assignedAt]);
  const deadlineMs = assignedAtMs + slaDurationMs;
  const [remainingMs, setRemainingMs] = useState(() =>
    Number.isFinite(deadlineMs) ? getRemainingMs(deadlineMs) : null,
  );

  useEffect(() => {
    if (!Number.isFinite(deadlineMs)) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setRemainingMs(getRemainingMs(deadlineMs));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [deadlineMs]);

  if (!Number.isFinite(deadlineMs)) {
    return null;
  }

  const hasLoaded = remainingMs !== null;
  const isBreached = hasLoaded && remainingMs <= 0;
  const label = isBreached
    ? "SLA aşıldı"
    : hasLoaded
      ? formatRemainingTime(remainingMs)
      : "--:--";
  const toneClassName = isBreached
    ? "border-red-200 bg-red-50 text-red-700"
    : "border-[rgba(255,138,0,0.28)] bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]";

  return (
    <span
      aria-label={isBreached ? "SLA aşıldı" : `SLA yanıt süresi kaldı: ${label}`}
      className={`inline-flex min-h-7 min-w-[4.5rem] items-center justify-center rounded-full border px-2.5 py-1 text-xs font-bold leading-4 tabular-nums ${toneClassName}`}
      role="status"
    >
      {label}
    </span>
  );
}
