import { calculatePrice, percentToBps } from "@/lib/commerce/pricing";
import type { PrelaunchSnapshot } from "@/services/admin/prelaunch";
import type { WeeklyLaunchMetrics } from "@/services/admin/launch-metrics";

/**
 * Yatırımcı görünümü: yalnızca gerçek (record_kind = real) kayıtlardan gelen sayılar ve açıkça
 * "senaryo" olarak işaretlenmiş bir birim ekonomi hesabı. Bilinmeyen değer sıfır gösterilmez (null kalır).
 */

export type InvestorFact = { label: string; value: number | null; note?: string };
export type InvestorMilestone = { detail: string; done: boolean | null; title: string };

const truthy = (value: string | undefined) => value === "true";

export function buildInvestorFacts(snapshot: PrelaunchSnapshot | null, weekly: WeeklyLaunchMetrics | null): InvestorFact[] {
  const orders = weekly ? weekly.weeks.reduce((sum, week) => sum + week.orders_created, 0) : null;
  const completed = weekly ? weekly.weeks.reduce((sum, week) => sum + week.orders_completed, 0) : null;
  return [
    { label: "Yayındaki doğrulanmış gerçek usta", value: snapshot?.network.published ?? weekly?.totals.published_providers ?? null },
    { label: "Yayımlı usta mağazası", value: snapshot?.network.stores ?? weekly?.totals.published_stores ?? null },
    { label: "Usta başvurusu (toplam)", value: weekly?.applications.total ?? snapshot?.network.applications ?? null, note: weekly ? `${weekly.applications.linked} tanesi bir kullanıcı hesabına bağlı` : undefined },
    { label: "İletişim izni veren müşteri ön kaydı", value: snapshot?.interest ?? weekly?.totals.consented_interest ?? null, note: "İznini geri çekenler sayılmaz" },
    { label: "Aktif hizmet kategorisi", value: snapshot?.active_categories ?? null },
    { label: weekly ? `Son ${weekly.weeks.length} haftada sipariş` : "Sipariş", value: orders, note: completed === null ? undefined : `${completed} tamamlandı` },
  ];
}

export function buildLaunchMilestones(snapshot: PrelaunchSnapshot | null): InvestorMilestone[] {
  const settings = snapshot?.settings ?? {};
  const known = Boolean(snapshot);
  return [
    { title: "Ürün ve altyapı", done: true, detail: "Katalog, usta mağazası, takvim, sipariş, mesajlaşma, belge doğrulama ve admin operasyonu kodda ve otomatik testlerde çalışıyor." },
    { title: "İlk doğrulanmış gerçek usta yayında", done: known ? snapshot!.network.published > 0 : null, detail: "Bir gerçek ustayla profil → belge → paket → takvim → yayın onayı uçtan uca tamamlanır." },
    { title: "İlk yayımlı mağaza ve takvim", done: known ? snapshot!.network.stores > 0 && snapshot!.network.calendars > 0 : null, detail: "Müşterinin fiyat ve saat görebilmesi için en az bir usta paketi ve açık takvim gerekir." },
    { title: "İzinli müşteri ön kaydı açık", done: known && "launch_interest_enabled" in settings ? truthy(settings.launch_interest_enabled) : null, detail: "KVKK izni, geri çekme ve kötüye kullanım korumaları kodda hazır; açma kararı kurucudadır." },
    { title: "Şirketleşme", done: false, detail: settings.launch_company_status || "Şirket kuruluşu bekleniyor. Fatura ve ödeme kuruluşu sözleşmesinin ön koşuludur." },
    { title: "Gerçek ödeme", done: false, detail: settings.launch_payment_status || "Canlı ödeme kapalı. Şirketleşme ve ödeme kuruluşu sözleşmesinden sonra açılır; şu an yalnızca test ortamı var." },
  ];
}

export type UnitEconomicsInput = { averageBasketTl: number; customerFeePercent: string; monthlyOrders: number; providerCommissionPercent: string };
export type UnitEconomics = { gmvMinor: number; perOrderRevenueMinor: number; providerPayoutMinor: number; revenueMinor: number; takeRatePercent: number };

/** Senaryo hesabı. Gerçek veri değildir; sipariş fiyatlamasıyla aynı yuvarlama kuralını (calculatePrice) kullanır. */
export function projectUnitEconomics(input: UnitEconomicsInput): UnitEconomics | null {
  const providerBps = percentToBps(input.providerCommissionPercent), customerBps = percentToBps(input.customerFeePercent);
  const basketMinor = Math.round(input.averageBasketTl * 100);
  if (providerBps === null || customerBps === null || !Number.isSafeInteger(input.monthlyOrders) || input.monthlyOrders < 0 || input.monthlyOrders > 1_000_000) return null;
  let quote;
  try {
    quote = calculatePrice(basketMinor, providerBps, customerBps);
  } catch {
    return null;
  }
  const perOrderRevenueMinor = quote.commission_minor + quote.customer_fee_minor;
  return {
    gmvMinor: quote.total_minor * input.monthlyOrders,
    perOrderRevenueMinor,
    providerPayoutMinor: quote.provider_gross_minor * input.monthlyOrders,
    revenueMinor: perOrderRevenueMinor * input.monthlyOrders,
    takeRatePercent: Math.round((perOrderRevenueMinor / quote.total_minor) * 1000) / 10,
  };
}
