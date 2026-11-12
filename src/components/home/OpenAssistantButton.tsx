"use client";

import { Sparkles } from "lucide-react";

/** Sayfanın köşesindeki akıllı asistanı doğrudan değerlendirme görünümünde açar. */
export function OpenAssistantButton({ label = "Sorunumu anlat" }: { label?: string }) {
  return (
    <button className="home-describe-button" onClick={() => window.dispatchEvent(new Event("fuwu:open-assistant"))} type="button">
      <Sparkles aria-hidden size={18} />
      {label}
    </button>
  );
}
