"use client";

import dynamic from "next/dynamic";
import type { VoiceCommandButtonProps } from "./VoiceCommandButton";

function VoiceCommandPlaceholder() {
  return (
    <div
      aria-hidden="true"
      className="mt-4 min-h-[4.25rem] rounded-lg border border-[rgba(13,20,36,0.08)] bg-[var(--surface-soft)]"
    />
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
