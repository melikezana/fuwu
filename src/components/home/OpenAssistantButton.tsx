"use client";

import { FuwiMascot } from "@/components/ai/FuwiMascot";

/**
 * Sayfanın köşesindeki Fuwi asistanını doğrudan değerlendirme görünümünde açar.
 * `message` verilirse asistana hazır yazılmış olarak aktarılır; kullanıcı göndermeden önce görür.
 */
export function OpenAssistantButton({ label = "Sorunumu anlat", message, className = "home-describe-button" }: { label?: string; message?: string; className?: string }) {
  return (
    <button className={className} onClick={() => window.dispatchEvent(new CustomEvent("fuwu:open-assistant", { detail: message ? { message } : null }))} type="button">
      <FuwiMascot className="size-6 shrink-0" decorative />
      {label}
    </button>
  );
}
