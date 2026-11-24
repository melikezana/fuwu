import { describe, expect, it } from "vitest";
import { basketMatches, calculatePrice, decodeBasket, encodeBasket, type BasketQuote } from "@/lib/commerce/pricing";
import { paymentText } from "@/lib/commerce/display";
import { reconciliationReasons } from "@/lib/commerce/reconciliation-state";
import type { CommerceOrder } from "@/lib/commerce/types";

const a = "11111111-1111-4111-8111-111111111111", b = "22222222-2222-4222-8222-222222222222";
const catalog = [{ id: a, price_minor: 35000 }, { id: b, price_minor: 15000 }];
function quote(base: number, lines: { id: string; quantity: number }[], providerBps = 1000, customerBps = 0): BasketQuote {
  const addons = lines.map(line => { const unit = catalog.find(item => item.id === line.id)!.price_minor; return { id: line.id, name: "Ekstra", quantity: line.quantity, unit_price_minor: unit, total_minor: unit * line.quantity }; });
  const addonsMinor = addons.reduce((sum, line) => sum + line.total_minor, 0);
  return { ...calculatePrice(base + addonsMinor, providerBps, customerBps), base_price_minor: base, addons, addons_minor: addonsMinor };
}

describe("direct purchase basket", () => {
  it("encodes baskets canonically and rejects malformed or oversized input", () => {
    expect(encodeBasket([{ id: b, quantity: 2 }, { id: a.toUpperCase(), quantity: 1 }])).toBe(`${a}:1,${b}:2`);
    expect(encodeBasket([{ id: a, quantity: 0 }, { id: "bad", quantity: 1 }, { id: b, quantity: 21 }])).toBe("");
    expect(decodeBasket("")).toEqual([]);
    expect(decodeBasket(`${a}:2,${b}:1`)).toEqual([{ id: a, quantity: 2 }, { id: b, quantity: 1 }]);
    for (const bad of [`${a}:0`, `${a}:21`, `${a}:1,${a}:2`, "x:1", `${a}:1;drop`, `${a}`, Array.from({ length: 11 }, (_, i) => `${String(i).padStart(8, "0")}-1111-4111-8111-111111111111:1`).join(",")]) expect(decodeBasket(bad), bad).toBeNull();
  });
  it("accepts the server basket only when every line and rounding matches the client calculation", () => {
    const selection = [{ id: a, quantity: 1 }, { id: b, quantity: 3 }];
    const good = quote(120000, selection, 1000, 250);
    expect(good.service_price_minor).toBe(200000);
    expect(good.customer_fee_minor).toBe(5000);
    expect(basketMatches(good, 120000, catalog, selection)).toBe(true);
    expect(basketMatches({ ...good, total_minor: good.total_minor - 1 }, 120000, catalog, selection)).toBe(false);
    expect(basketMatches({ ...good, base_price_minor: 100000 }, 120000, catalog, selection)).toBe(false);
    expect(basketMatches(good, 120000, catalog, [{ id: a, quantity: 1 }])).toBe(false);
    expect(basketMatches({ ...good, addons: good.addons.map(line => ({ ...line, unit_price_minor: 1 })) }, 120000, catalog, selection)).toBe(false);
    expect(basketMatches(good, 120000, [{ id: a, price_minor: 35000 }], selection)).toBe(false);
    expect(basketMatches(quote(90000, []), 90000, catalog, [])).toBe(true);
  });
  it("labels pay-at-door payments as due at the door, not as a failed payment", () => {
    expect(paymentText({ payment_status: "UNPAID", payment_method: "PAY_AT_DOOR" })).toBe("Kapıda ödenecek");
    expect(paymentText({ payment_status: "PAID", payment_method: "PAY_AT_DOOR" })).toBe("Kapıda ödendi");
    expect(paymentText({ payment_status: "PAID", payment_method: "CARD" })).toContain("Sandbox");
  });
  it("does not raise card reconciliation alarms for confirmed pay-at-door orders", () => {
    const order = { status: "CONFIRMED", payment_status: "UNPAID", payment_method: "PAY_AT_DOOR", expires_at: new Date(0).toISOString() } as CommerceOrder;
    expect(reconciliationReasons(order, null, Date.now())).toEqual([]);
    expect(reconciliationReasons({ ...order, payment_method: "CARD" }, null, Date.now())).toHaveLength(1);
  });
});
