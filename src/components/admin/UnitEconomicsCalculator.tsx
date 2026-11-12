"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { projectUnitEconomics } from "@/lib/admin/investor-view";

const money = (minor: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(minor / 100);

export function UnitEconomicsCalculator({ commissionPercent, customerFeePercent }: { commissionPercent: string; customerFeePercent: string }) {
  const [orders, setOrders] = useState("300"), [basket, setBasket] = useState("1500");
  const [commission, setCommission] = useState(commissionPercent), [fee, setFee] = useState(customerFeePercent);
  const result = projectUnitEconomics({ averageBasketTl: Number(basket.replace(",", ".")), customerFeePercent: fee, monthlyOrders: Number(orders), providerCommissionPercent: commission });
  return (
    <section className="commerce-panel investor-calculator" aria-labelledby="unit-economics-title">
      <h2 id="unit-economics-title">Gelir modeli · senaryo hesaplayıcı</h2>
      <p className="commerce-help">Bu bölüm gerçek veri değildir. Varsayımları değiştirerek modelin nasıl çalıştığını gösterir; hesap, sipariş fiyatlamasıyla aynı kuralı kullanır. Oranlar Ayarlar&apos;daki güncel değerlerle başlar.</p>
      <div className="investor-inputs">
        <label className="commerce-field">Aylık sipariş<input inputMode="numeric" value={orders} onChange={event => setOrders(event.target.value)} /></label>
        <label className="commerce-field">Ortalama hizmet bedeli (TL)<input inputMode="decimal" value={basket} onChange={event => setBasket(event.target.value)} /></label>
        <label className="commerce-field">Usta komisyonu (%)<input inputMode="decimal" value={commission} onChange={event => setCommission(event.target.value)} /></label>
        <label className="commerce-field">Müşteri platform ücreti (%)<input inputMode="decimal" value={fee} onChange={event => setFee(event.target.value)} /></label>
      </div>
      <div aria-live="polite">
        {result ? (
          <dl className="prelaunch-readiness">
            <div><dt>Aylık işlem hacmi (müşterinin ödediği)</dt><dd>{money(result.gmvMinor)}</dd></div>
            <div><dt>FUWU brüt geliri</dt><dd>{money(result.revenueMinor)}</dd></div>
            <div><dt>Ustalara giden tutar</dt><dd>{money(result.providerPayoutMinor)}</dd></div>
            <div><dt>Sipariş başına FUWU geliri</dt><dd>{money(result.perOrderRevenueMinor)}</dd></div>
            <div><dt>Gelir oranı (take rate)</dt><dd>%{result.takeRatePercent.toLocaleString("tr-TR")}</dd></div>
          </dl>
        ) : (
          <p className="commerce-error" role="alert">Değerleri kontrol et: sipariş sayısı tam sayı, hizmet bedeli sıfırdan büyük, oranlar %0–100 arasında olmalı.</p>
        )}
      </div>
      <p className="commerce-help">Brüt gelirden ödeme kuruluşu kesintisi, vergi, SMS ve pazarlama giderleri düşülmemiştir.</p>
      <button className="commerce-secondary investor-print" onClick={() => window.print()} type="button"><Printer aria-hidden size={18} /> Yazdır / PDF olarak kaydet</button>
    </section>
  );
}
