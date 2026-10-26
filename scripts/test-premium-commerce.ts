import assert from "node:assert/strict";
import { bookingDays, legacyPurchasePath } from "../src/lib/commerce/booking";
import { providerPurchaseLinks } from "../src/lib/commerce/purchase-links";
import { catalogPreviews } from "../src/lib/commerce/previews";
import type { PublicOffer } from "../src/lib/commerce/types";

const offer: PublicOffer = { id: "offer", provider_id: "provider", service_id: catalogPreviews[1].id, variant_id: "two-units", variant_name: "2 klima", price_minor: 170000, duration_minutes: 120, district_ids: ["kadikoy"], provider_name: "TEST Usta", profile_image_url: null, rating: null, review_count: 0 };
const catalog = { services: catalogPreviews, offers: [offer, { ...offer, id: "other-region", price_minor: 50000, district_ids: ["besiktas"] }], districts: [{ id: "kadikoy", name: "Kadıköy" }, { id: "besiktas", name: "Beşiktaş" }], unavailable: false };
const purchase = providerPurchaseLinks(catalog, "Kadıköy").provider;
assert.equal(purchase.priceMinor, 170000);
const link = new URL(purchase.href, "https://fuwu.test");
assert.equal(link.searchParams.get("variant"), "two-units");
assert.equal(link.searchParams.get("district"), "kadikoy");
assert.equal(link.searchParams.get("provider"), "provider");
assert.deepEqual(providerPurchaseLinks(catalog, "unknown"), {});
assert.deepEqual(providerPurchaseLinks({ ...catalog, unavailable: true }), {});
console.log("PASS Purchase cards preserve package and district; unavailable offers cannot advertise a price");

assert.equal(legacyPurchasePath({ service: "Su Tesisatı", district: "Kadıköy", offer_amount: "1" }), "/services?category=tesisat&district=Kad%C4%B1k%C3%B6y");
assert.equal(legacyPurchasePath({ provider_id: "30000000-0000-4000-8000-000000000001" }), "/providers/30000000-0000-4000-8000-000000000001#provider-services");
assert.equal(legacyPurchasePath({ provider_id: "//evil.test", service: ["Elektrik", "Temizlik"] }), "/services?category=elektrik-hizmeti");
assert.equal(legacyPurchasePath({}), "/services");
console.log("PASS Legacy links preserve safe buying context and discard client prices");

assert.deepEqual(bookingDays("2026-12-31", 3).map(day => day.iso), ["2026-12-31", "2027-01-01", "2027-01-02"]);
assert.equal(bookingDays("2028-02-28", 3)[1].iso, "2028-02-29");
assert.deepEqual(bookingDays("2026-10-26", 2).map(day => day.label), ["Bugün", "Yarın"]);
console.log("PASS Istanbul quick dates handle year rollover and leap days");
