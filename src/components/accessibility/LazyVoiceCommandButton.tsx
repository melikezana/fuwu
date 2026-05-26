"use client";

import dynamic from "next/dynamic";
import type { VoiceCommandButtonProps } from "./VoiceCommandButton";

function VoiceCommandPlaceholder() {
  return (
    <div
      aria-hidden="true"
      className="mt-4 grid gap-3 rounded-lg border border-[rgba(13,20,36,0.08)] bg-[var(--surface-soft)] p-3 sm:grid-cols-[8.75rem_6.5rem_11.5rem_6rem_minmax(0,1fr)] sm:items-center"
    >
      <span className="h-11 rounded-md bg-[var(--brand-navy)]/90 shadow-[0_14px_32px_rgba(13,20,36,0.12)]" />
      <span className="h-11 rounded-md bg-white shadow-[inset_0_0_0_1px_rgba(13,20,36,0.08)]" />
      <span className="h-11 rounded-md bg-white shadow-[inset_0_0_0_1px_rgba(13,20,36,0.08)]" />
      <span className="h-11 rounded-md bg-white shadow-[inset_0_0_0_1px_rgba(13,20,36,0.08)]" />
      <span className="h-4 min-w-0 rounded-full bg-white/80" />
    </div>
  );
}

const DynamicVoiceCommandButton = dynamic(
  () => import("./VoiceCommandButton").then((module) => module.VoiceCommandButton),
  {
    loading: VoiceCommandPlaceholder,
    ssr: false,
  },
);

export function LazyVoiceCommandButton(props: VoiceCommandButtonProps) {
  return <DynamicVoiceCommandButton {...props} />;
}
