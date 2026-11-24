// Vitrin metinleri ve satış anahtarları. Hizmet doğrudan satın alınır: paket → ekstra → usta → saat → adres → sipariş.
// Kural: yayımlı gerçek usta yokken "doğrulanmış usta" vaadi verilmez; satış dili yalnızca gerçek akışı anlatır.
export const ONLINE_PURCHASE_CLOSED = "Bu hizmet şu anda satın alınamıyor.";
export const STOREFRONT_COPY = {
  heroDescription: "Kapsamı ve fiyatı baştan belli ev hizmetleri. Paketini seç, ekstranı ekle, ustanın boş saatinden randevunu al.",
  heroStage: "Hizmeti şimdi satın al, ödemeyi iş bitince kapıda yap.",
  howTitle: "Paketini seç. Randevunu al. İş bitince kapıda öde.",
  trustStage: "Toplam tutarı satın almadan önce görürsün. Onayın olmadan ek ücret alınmaz.",
  journeyStage: "Siparişin bu adımlarla ilerler; her adımı sipariş sayfanda takip edersin.",
  catalogLead: "Hizmetini seç, ekstranı ekle, ustanı ve saatini belirle.",
  catalogStageTitle: "Bu hizmetler için usta takvimleri açılıyor.",
  catalogStage: "Kapsamı ve dahil olmayanları şimdiden incele; ustanın boş saati açıldığında hizmeti buradan doğrudan satın alırsın.",
  seoDescription: "İstanbul’da ev hizmetini doğrudan satın al: kapsam ve fiyat baştan belli, ekstraları ekle, ustanın boş saatinden randevu al, ödemeyi iş bitince kapıda yap.",
} as const;
/** @deprecated Eski adı; yeni kod STOREFRONT_COPY kullanır. */
export const PRELAUNCH_COPY = STOREFRONT_COPY;
export const INTEREST_CONSENT_VERSION = "prelaunch-2026-10-30";

export function publicAnnouncement(message: string): string {
  const normalized = message.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/\p{M}/gu, "").replaceAll("ı", "i");
  return normalized.includes("gelistiriyoruz") ? "" : message.trim();
}

/**
 * Doğrudan satın alma (kapıda ödeme) açık mı? Varsayılan açık; acil durumda sunucuda
 * FUWU_DIRECT_PURCHASE_DISABLED=true ile kapatılır. Veritabanındaki pay_at_door_enabled ayarı ayrıca kontrol edilir.
 */
export function directPurchaseEnabled(): boolean {
  return process.env.FUWU_DIRECT_PURCHASE_DISABLED !== "true";
}

// Server-only switch for authorized sandbox testing; it cannot enable live iyzico.
export function sandboxCheckoutEnabled(): boolean {
  return process.env.FUWU_SANDBOX_CHECKOUT_ENABLED === "true";
}

/** Online kartla ödeme (iyzico) yalnızca ödeme kuruluşu yapılandırıldığında görünür. */
export function cardCheckoutEnabled(): boolean {
  return sandboxCheckoutEnabled();
}
