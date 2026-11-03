"use client";

import { useLinkStatus } from "next/link";

/**
 * Bir Next.js Link'in içine konur. Dokunulan sekme, sunucu yanıtı gelmeden
 * anında seçili görünür ve küçük bir yükleniyor işareti gösterir.
 * Görünüm tamamen CSS ile yönetilir (growth.css › "Anında geri bildirim").
 */
export function LinkPending() {
  const { pending } = useLinkStatus();
  return <span aria-hidden="true" className="link-pending" data-pending={pending ? "true" : undefined} />;
}
