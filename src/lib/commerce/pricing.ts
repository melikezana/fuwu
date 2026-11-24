// Rates are basis points: 100 bps = 1%. No binary floating point money arithmetic.
export const FEE_TERMS_VERSION = "fuwu-fees-v1";
export type PriceQuote = {
  service_price_minor: number; customer_fee_minor: number; total_minor: number;
  commission_minor: number; provider_gross_minor: number;
  provider_commission_bps: number; customer_fee_bps: number; terms_version: string;
};

export function calculatePrice(serviceMinor: number, providerBps = 1000, customerBps = 0): PriceQuote {
  if (!Number.isSafeInteger(serviceMinor) || serviceMinor <= 0 || serviceMinor > 100_000_000 ||
    ![providerBps, customerBps].every(rate => Number.isInteger(rate) && rate >= 0 && rate <= 10000)) throw new Error("invalid_price");
  const portion = (bps: number) => Number((BigInt(serviceMinor) * BigInt(bps) + BigInt(5000)) / BigInt(10000));
  const commission = portion(providerBps), fee = portion(customerBps);
  return { service_price_minor: serviceMinor, customer_fee_minor: fee, total_minor: serviceMinor + fee,
    commission_minor: commission, provider_gross_minor: serviceMinor - commission,
    provider_commission_bps: providerBps, customer_fee_bps: customerBps, terms_version: FEE_TERMS_VERSION };
}

export function percentToBps(value: string): number | null {
  if (!/^\d{1,3}(?:[.,]\d{1,2})?$/.test(value.trim())) return null;
  const [whole, fraction = ""] = value.trim().replace(",", ".").split(".");
  const bps = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return bps <= 10000 ? bps : null;
}

// Müşteriye gösterilen tek fiyat: hizmet bedeli + müşteri payı. commerce_quote ile aynı yuvarlama.
export function customerPrice(serviceMinor: number, customerBps = 0): number {
  if (!Number.isSafeInteger(serviceMinor) || serviceMinor <= 0 || !Number.isInteger(customerBps) || customerBps < 0 || customerBps > 10000) return serviceMinor;
  return serviceMinor + Number((BigInt(serviceMinor) * BigInt(customerBps) + BigInt(5000)) / BigInt(10000));
}

export type PublicFeeRates = { default_customer_fee_bps: number; categories: { id: string; customer_fee_bps: number | null }[] };

export function customerFeeBpsFor(rates: PublicFeeRates | null, categoryId: string | null | undefined, categoryBps?: number | null): number {
  if (typeof categoryBps === "number") return categoryBps;
  const override = rates?.categories.find(item => item.id === categoryId)?.customer_fee_bps;
  return typeof override === "number" ? override : rates?.default_customer_fee_bps ?? 0;
}

export type BasketLine = { id: string; name: string; quantity: number; unit_price_minor: number; total_minor: number };
export type BasketQuote = PriceQuote & { base_price_minor: number; addons: BasketLine[]; addons_minor: number };
export type BasketSelection = { id: string; quantity: number }[];

/** Sepet seçimini URL için kısa ve sıralı biçime çevirir: "id:2,id:1". Geçersiz satırlar atılır. */
export function encodeBasket(selection: BasketSelection): string {
  return selection.filter(line => /^[0-9a-f-]{36}$/i.test(line.id) && Number.isInteger(line.quantity) && line.quantity >= 1 && line.quantity <= 20)
    .map(line => `${line.id.toLowerCase()}:${line.quantity}`).sort().join(",");
}

/** encodeBasket çıktısını okur; biçim bozuksa null döner (sunucu fiyatı yine kendisi hesaplar). */
export function decodeBasket(value: string | null | undefined): BasketSelection | null {
  if (!value) return [];
  if (value.length > 600) return null;
  const lines = value.split(",");
  if (lines.length > 10) return null;
  const seen = new Set<string>();
  const selection: BasketSelection = [];
  for (const line of lines) {
    const match = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}):([1-9]|1[0-9]|20)$/i.exec(line);
    if (!match || seen.has(match[1].toLowerCase())) return null;
    seen.add(match[1].toLowerCase());
    selection.push({ id: match[1].toLowerCase(), quantity: Number(match[2]) });
  }
  return selection;
}

/**
 * Sunucunun sepet teklifini istemcide bağımsız olarak doğrular: paket fiyatı, ekstra satırları ve
 * komisyon/müşteri payı yuvarlaması aynı olmalı. Tutmazsa ödeme adımına geçilmez.
 */
export function basketMatches(quote: BasketQuote, basePriceMinor: number, catalog: { id: string; price_minor: number }[], selection: BasketSelection): boolean {
  try {
    if (quote.base_price_minor !== basePriceMinor || quote.addons.length !== selection.length) return false;
    let addons = 0;
    for (const chosen of selection) {
      const line = quote.addons.find(item => item.id === chosen.id);
      const listed = catalog.find(item => item.id === chosen.id);
      if (!line || !listed || line.quantity !== chosen.quantity || line.unit_price_minor !== listed.price_minor || line.total_minor !== listed.price_minor * chosen.quantity) return false;
      addons += line.total_minor;
    }
    if (quote.addons_minor !== addons) return false;
    const expected = calculatePrice(basePriceMinor + addons, quote.provider_commission_bps, quote.customer_fee_bps);
    return (Object.keys(expected) as (keyof PriceQuote)[]).every(key => expected[key] === quote[key]);
  } catch { return false; }
}
