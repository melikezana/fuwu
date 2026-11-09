export const ONLINE_PURCHASE_CLOSED = "Online satın alma henüz açılmadı.";
// Ön lansman metinleri: satın alma ve yayımlı gerçek usta olmadan "doğrulanmış usta / öde" vaadi verilmez.
// Satış açıldığında yalnızca bu sabitler güncellenir; ekranlar aynı kalır.
export const PRELAUNCH_COPY = {
  heroDescription: "Kapsamı ve fiyatı baştan belli ev hizmetleri. Hizmeti seç, ustayı tanı, zamanını planla.",
  heroStage: "Usta ağımızı kuruyoruz. Online satın alma henüz açılmadı.",
  howTitle: "Hizmeti seç. Ustayı tanı. Zamanını planla.",
  trustStage: "Online satın alma henüz açılmadı. Bu taahhütler satış açıldığında geçerli olur.",
  journeyStage: "Online satın alma henüz açılmadı. Satış açıldığında süreç aşağıdaki gibi işleyecek.",
  seoDescription: "İstanbul’da ev hizmetlerini kapsamı ve fiyatıyla incele, ustaları tanı, zamanını planla. Online satın alma açılışta başlayacak.",
} as const;
export const INTEREST_CONSENT_VERSION = "prelaunch-2026-10-30";

export function publicAnnouncement(message: string): string {
  const normalized = message.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/\p{M}/gu, "").replaceAll("ı", "i");
  return normalized.includes("gelistiriyoruz") ? "" : message.trim();
}

// Server-only switch for authorized sandbox testing; it cannot enable live iyzico.
export function sandboxCheckoutEnabled(): boolean {
  return process.env.FUWU_SANDBOX_CHECKOUT_ENABLED === "true";
}
