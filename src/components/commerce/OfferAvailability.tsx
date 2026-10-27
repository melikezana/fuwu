"use client";

import { useState } from "react";
import { appointment, commerceError, todayIstanbul } from "@/lib/commerce/display";
import type { Slot } from "@/lib/commerce/types";

export function OfferAvailability({ offeringId, districtId }: { offeringId: string; districtId: string }) {
  const [result, setResult] = useState({ key: "", message: "", busy: false });
  const key = `${offeringId}:${districtId}:${todayIstanbul()}`;
  async function inspect() {
    setResult({ key, message: "", busy: true });
    try {
      const response = await fetch(`/api/commerce/slots?${new URLSearchParams({ offering: offeringId, district: districtId, day: todayIstanbul(), days: "7" })}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      const first = body.days?.flatMap((day: { slots: Slot[] }) => day.slots)[0] as Slot | undefined;
      setResult({ key, message: first ? `İlk uygun randevu: ${appointment(first.starts_at)}` : "Önümüzdeki 7 gün uygun randevu yok. Takvimden diğer günleri kontrol edebilirsin.", busy: false });
    } catch (error) { setResult({ key, message: commerceError(String(error)), busy: false }); }
  }
  return <div className="commerce-offer-availability"><button type="button" className="commerce-text-link" disabled={!districtId || (result.key === key && result.busy)} onClick={inspect}>{result.key === key && result.busy ? "Müsaitlik kontrol ediliyor…" : "Müsaitliği Gör"}</button>{result.key === key && result.message && <p className="commerce-help" role="status">{result.message} Saatler seçim sırasında tekrar doğrulanır.</p>}</div>;
}
