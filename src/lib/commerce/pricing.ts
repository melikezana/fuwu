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
