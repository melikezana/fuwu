"use client";

import { useId, useState } from "react";
import { Calculator } from "lucide-react";

const COMMISSION_PERCENT = 10;
const money = (value: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value);

export function ProviderEarningsCalculator() {
  const priceId = useId();
  const jobsId = useId();
  const [price, setPrice] = useState(1500);
  const [jobs, setJobs] = useState(8);
  const monthlySales = price * jobs * 4;
  const commission = Math.round(monthlySales * COMMISSION_PERCENT / 100);

  return (
    <section aria-labelledby="earnings-title" className="provider-calc">
      <div className="provider-calc-head">
        <Calculator aria-hidden size={22} />
        <div>
          <h2 id="earnings-title">Ne kazanırım?</h2>
          <p>Kendi fiyatını ve haftalık iş sayını gir, tahmini aylık tabloyu gör.</p>
        </div>
      </div>
      <div className="provider-calc-inputs">
        <label htmlFor={priceId}>Ortalama iş ücretin
          <span className="provider-calc-value">{money(price)}</span>
          <input id={priceId} type="range" min={300} max={10000} step={100} value={price} onChange={event => setPrice(Number(event.target.value))} />
        </label>
        <label htmlFor={jobsId}>Haftada kaç iş?
          <span className="provider-calc-value">{jobs} iş</span>
          <input id={jobsId} type="range" min={1} max={30} step={1} value={jobs} onChange={event => setJobs(Number(event.target.value))} />
        </label>
      </div>
      <dl className="provider-calc-result" aria-live="polite">
        <div><dt>Aylık satışın</dt><dd>{money(monthlySales)}</dd></div>
        <div><dt>FUWU komisyonu (%{COMMISSION_PERCENT})</dt><dd>−{money(commission)}</dd></div>
        <div className="is-total"><dt>Sana kalan (brüt)</dt><dd>{money(monthlySales - commission)}</dd></div>
      </dl>
      <p className="provider-calc-note">Teklif, bakiye veya üyelik ücreti yok. Komisyon yalnızca tamamlanan işten kesilir. Ödeme kuruluşu kesintisi panelinde ayrıca gösterilir. Bu bir tahmindir; iş ve kazanç garantisi değildir.</p>
    </section>
  );
}
