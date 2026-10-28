import assert from "node:assert/strict";
import fs from "node:fs";
import { calculatePrice, percentToBps } from "../src/lib/commerce/pricing";
import { featuredCategories, getCatalogNavigation } from "../src/lib/commerce/catalog-navigation";
import { verifyCommercePayment } from "../src/lib/commerce/payment";

const checks: string[] = [];
const categories = Array.from({ length: 11 }, (_, n) => ({ id: String(n), name: `Özel hizmet ${n}`, slug: `ozel-hizmet-${n}`, is_active: true, is_visible: n !== 9, is_featured: n < 8, sort_order: 11 - n }));
const nav = getCatalogNavigation({ categories, services: [], offers: [], unavailable: true });
assert.equal(nav.length, 10); assert.ok(nav.every(item => item.offerCount === 0));
assert.equal(nav.find(item => item.slug === "ozel-hizmet-0")?.title, "Özel hizmet 0");
assert.equal(featuredCategories(nav).length, 6); assert.equal(featuredCategories(nav)[0].slug, "ozel-hizmet-7");
assert.deepEqual(getCatalogNavigation({ categories: [], services: [], offers: [], unavailable: true }), []);
assert.equal(getCatalogNavigation({ categories: [{ id: "a", name: "Elektrik Hizmeti · Yönetici Adı", slug: "elektrik-hizmeti" }], services: [], offers: [], unavailable: false })[0].title, "Elektrik Hizmeti · Yönetici Adı");
const split = getCatalogNavigation({ categories: [{ id: "garden", name: "Bahçe Bakımı", slug: "bahce-bakimi" }, { id: "pool", name: "Havuz Bakımı", slug: "havuz-bakimi" }, { id: "rug", name: "Halı Yıkama", slug: "hali-yikama" }], services: [], offers: [], unavailable: false });
assert.equal(split.find(item => item.slug === "havuz-bakimi")?.iconName, "droplets");
assert.equal(split.find(item => item.slug === "hali-yikama")?.iconName, "rug");
assert.notEqual(split.find(item => item.slug === "havuz-bakimi")?.id, split.find(item => item.slug === "bahce-bakimi")?.id);
checks.push("11 real category definitions survive commerce failure; hidden rows stay hidden, admin labels/order win, empty data never invents four products.");

assert.deepEqual(calculatePrice(200000, 1000, 500), { service_price_minor: 200000, customer_fee_minor: 10000, total_minor: 210000, commission_minor: 20000, provider_gross_minor: 180000, provider_commission_bps: 1000, customer_fee_bps: 500, terms_version: "fuwu-fees-v1" });
assert.equal(calculatePrice(200000).customer_fee_minor, 0);
assert.equal(calculatePrice(1, 5000, 5000).total_minor, 2); assert.equal(calculatePrice(1, 5000).commission_minor, 1);
for (const price of [-1, 0, 1.1, NaN, Infinity, 100000001]) assert.throws(() => calculatePrice(price));
for (const rate of [-1, NaN, Infinity, 0.1, 10001]) assert.throws(() => calculatePrice(200000, rate));
for (const value of ["-1", "101", "NaN", "", "1.234", "1e2"]) assert.equal(percentToBps(value), null);
assert.equal(percentToBps("1"), 100); assert.equal(percentToBps("0,05"), 5); assert.equal(percentToBps("10.25"), 1025);
checks.push("Integer money arithmetic, half-up rounding, 10%/5% split, default 0%, one-percent boundary and invalid/negative fees validated.");

const order = { id: "fuwu3", total_minor: 210000, provider_gross_minor: 180000 };
const response = { status: "success", token: "test-token", conversationId: "order-fuwu3", basketId: "fuwu3", currency: "TRY", price: 2100, paidPrice: 2100, paymentStatus: "SUCCESS", paymentId: "test-payment", fraudStatus: 1, itemTransactions: [{ itemId: "fuwu3", paymentTransactionId: "test-item", price: 2100, subMerchantPrice: 1800, subMerchantKey: "test-submerchant" }] };
assert.equal(verifyCommercePayment(response, order, "test-token", "order-fuwu3", { submerchantKey: "test-submerchant" }), true);
assert.throws(() => verifyCommercePayment({ ...response, paidPrice: 2000 }, order, "test-token", "order-fuwu3"));
assert.throws(() => verifyCommercePayment({ ...response, itemTransactions: [{ ...response.itemTransactions[0], subMerchantPrice: 1900 }] }, order, "test-token", "order-fuwu3"));
checks.push("Payment verifier accepts the exact two-sided sandbox split and rejects underpayment or changed submerchant share (synthetic processor response).");
fs.mkdirSync("artifacts/fuwu3", { recursive: true });
fs.writeFileSync("artifacts/fuwu3/unit-tests.json", JSON.stringify({ mode: "Pure unit tests, synthetic payment response; no external integration", checks }, null, 2));
console.log(`${checks.length} FUWU3 test groups passed.`);
