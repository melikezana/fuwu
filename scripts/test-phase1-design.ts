import assert from "node:assert/strict";
import { getCatalogNavigation, matchesCatalogQuery, offersForService } from "../src/lib/commerce/catalog-navigation";
import { catalogPreviews } from "../src/lib/commerce/previews";
import type { PublicOffer } from "../src/lib/commerce/types";

const service = { ...catalogPreviews[0], id: "tap", category_id: "plumbing" };
const offer: PublicOffer = { id: "offer", provider_id: "provider", service_id: "tap", variant_id: null, variant_name: null, price_minor: 85000, duration_minutes: 60, district_ids: ["kadikoy"], provider_name: "TEST", profile_image_url: null, rating: null, review_count: 0 };
const categories = [{ id: "plumbing", name: "Su Tesisatı", slug: "tesisat" }, { id: "cleaning", name: "Temizlik", slug: "temizlik" }];
const checks: string[] = [];

const live = getCatalogNavigation({ categories, services: [service], offers: [offer], unavailable: false });
assert.equal(live.length, 2);
assert.equal(live[0].href, "/services?category=tesisat");
assert.equal(live[0].offerCount, 1);
assert.equal(live[1].offerCount, 0);
assert.equal(live[1].startingHint, "Henüz satışa açılmadı");
assert.ok(!live.some(category => category.slug === "boya-badana"));
checks.push("Only database-active categories are navigable; categories with no offers never claim availability.");

assert.equal(getCatalogNavigation({ categories, services: [{ ...service, is_active: false }], offers: [offer], unavailable: false })[0].offerCount, 0);
assert.equal(getCatalogNavigation({ categories: [], services: [service], offers: [offer], unavailable: false }).length, 0);
checks.push("An inactive service cannot make a category purchasable; an empty live catalog does not invent categories.");

const preview = getCatalogNavigation({ categories, services: [service], offers: [offer], unavailable: true });
assert.equal(preview.length, 2);
assert.ok(preview.every(category => category.preview && category.offerCount === 0));
checks.push("Connection failure preserves the real categories and never invents fallback products or prices.");

assert.ok(matchesCatalogQuery(service, "  TESİSAT  ", "Tesisat"));
assert.ok(matchesCatalogQuery(service, "SIZDIRMAZLIK musluk"));
assert.ok(matchesCatalogQuery({ ...service, name: "Çalışma masası montajı" }, "calisma masasi"));
assert.ok(!matchesCatalogQuery(service, "temizlik"));
assert.ok(!matchesCatalogQuery(service, "yenileme"));
checks.push("Turkish casing, missing diacritics and multiple words work; excluded work does not become a search match.");

assert.equal(offersForService([offer], "tap", "besiktas").length, 0);
assert.equal(offersForService([offer], "tap", "kadikoy").length, 1);
assert.equal(offersForService([offer, { ...offer, price_minor: NaN }, { ...offer, price_minor: -1 }], "tap").length, 1);
checks.push("Price and availability respect the selected district; invalid prices are not offered for purchase.");
console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));
