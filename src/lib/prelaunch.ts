export const ONLINE_PURCHASE_CLOSED = "Online satın alma henüz açılmadı.";
export const INTEREST_CONSENT_VERSION = "prelaunch-2026-10-30";

export function publicAnnouncement(message: string): string {
  const normalized = message.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/\p{M}/gu, "").replaceAll("ı", "i");
  return normalized.includes("gelistiriyoruz") ? "" : message.trim();
}

// Server-only switch for authorized sandbox testing; it cannot enable live iyzico.
export function sandboxCheckoutEnabled(): boolean {
  return process.env.FUWU_SANDBOX_CHECKOUT_ENABLED === "true";
}
