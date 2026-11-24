// Doğrudan satın alma arayüzü: paket + ekstra sepeti + usta + saat + adres/not + ödeme (online kart önce; kapıda ödeme yalnızca admin açarsa) → sipariş.
// Yalnızca arayüz fikstürü; API yanıtları taklit edilir, gerçek sipariş oluşturulmaz.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createServer } from "vite";
import { chromium } from "playwright";
const output = path.resolve(process.env.COMMERCE_OUTPUT_DIR || "artifacts/direct-purchase"); await fs.mkdir(output, { recursive: true });
const root = path.resolve("e2e/fixtures/commerce-ui");
const server = await createServer({ configFile: false, root, publicDir: path.resolve("public"), resolve: { alias: { "@/app/admin/marketplace/health-actions": path.join(root, "health-action.ts"), "@/app/providers/[id]/actions": path.join(root, "review-action.ts"), "@": path.resolve("src"), "next/link": path.join(root, "next-link.tsx"), "next/image": path.join(root, "next-image.tsx"), "next/navigation": path.join(root, "next-navigation.ts") } }, esbuild: { jsx: "automatic" }, server: { host: "127.0.0.1", port: 3038, strictPort: true, fs: { allow: [process.cwd()] } } });
await server.listen();
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
const report = { checks: [], screenshots: [], errors: [] };
const base = "http://127.0.0.1:3038";
const prices = { "80000000-0000-4000-8000-000000000001": 35000, "80000000-0000-4000-8000-000000000002": 15000, "80000000-0000-4000-8000-000000000003": 40000 };
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 1000 }, reducedMotion: "reduce" });
    await context.addInitScript(() => { localStorage.setItem("fuwu:cookie-consent", "rejected"); sessionStorage.setItem("fuwu_splash_shown", "true"); });
    const page = await context.newPage(); page.on("pageerror", error => report.errors.push(error.message)); page.on("console", message => { if (message.type() === "error") report.errors.push(message.text()); });
    const shot = async name => { await page.evaluate(() => document.fonts.ready); await page.screenshot({ path: path.join(output, `${name}-${width}.png`), fullPage: true }); report.screenshots.push(`${name}-${width}.png`); };
    const fits = async label => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${label} fits ${width}px`);
    await page.route("**/api/commerce/quote?**", route => {
      const q = new URL(route.request().url()).searchParams; const basePrice = 85000;
      const lines = (q.get("addons") || "").split(",").filter(Boolean).map(entry => { const [id, quantity] = entry.split(":"); return { id, name: "TEST", quantity: Number(quantity), unit_price_minor: prices[id], total_minor: prices[id] * Number(quantity) }; });
      const addonsMinor = lines.reduce((sum, line) => sum + line.total_minor, 0), price = basePrice + addonsMinor, commission = Math.round(price / 10);
      return route.fulfill({ json: { quote: { base_price_minor: basePrice, addons: lines, addons_minor: addonsMinor, service_price_minor: price, customer_fee_minor: 0, total_minor: price, commission_minor: commission, provider_gross_minor: price - commission, provider_commission_bps: 1000, customer_fee_bps: 0, terms_version: "fuwu-fees-v1" } } });
    });
    await page.route("**/api/commerce/slots?**", route => { const q = new URL(route.request().url()).searchParams; const day = q.get("day"); if (q.get("days")) return route.fulfill({ json: { days: [{ day, slots: [{ starts_at: `${day}T11:00:00+03:00`, ends_at: `${day}T12:00:00+03:00` }] }] } }); return route.fulfill({ json: { slots: [{ starts_at: `${day}T11:00:00+03:00`, ends_at: `${day}T12:00:00+03:00` }, { starts_at: `${day}T14:00:00+03:00`, ends_at: `${day}T15:00:00+03:00` }] } }); });
    await page.route("**/api/commerce/legal?**", route => route.fulfill({ json: { legal: { version: "mesafeli-hizmet-2026-11-24", ready: true, provider: { name: "TEST Ahmet Yılmaz", display_name: "TEST · Ahmet Usta", tax_id: "11111111110", tax_office: "Kadıköy", address: "TEST Caferağa Mah. Örnek Sok. No 1 Kadıköy", phone: "+90 555 000 33 33", ready: true }, intermediary: { name: "Melike Dağkesen (FUWU)", tax_id: "22222222220", tax_office: null, mersis: null, address: "TEST FUWU Adresi Mah. Sok. No 2 İstanbul", phone: "+90 850 000 00 00", email: "fuwuhizmet@gmail.com", ready: true } } } }));
    let placed; await page.route("**/api/commerce/orders", async route => { placed = route.request().postDataJSON(); await route.fulfill({ status: 201, json: { order: { id: "40000000-0000-4000-8000-000000000001", status: "CONFIRMED" } } }); });
    const action = () => page.locator(width < 768 ? ".booking-sticky" : ".booking-desktop-actions").getByRole("button", { name: /Devam Et|Siparişi Onayla|Ödemeye Geç/ });
    // Sipariş taslağı sessionStorage'da tutulur; her senaryo temiz taslakla başlar.
    const clearDrafts = () => page.evaluate(() => { for (const key of Object.keys(sessionStorage)) if (key !== "fuwu_splash_shown") sessionStorage.removeItem(key); }).catch(() => {});
    const toReview = async query => {
      await clearDrafts(); await page.goto(`${base}/?screen=direct-purchase${query}`, { waitUntil: "domcontentloaded" }); await page.getByRole("heading", { level: 1 }).waitFor();
      await page.getByLabel("İlçe", { exact: true }).selectOption({ label: "Kadıköy" }); await page.getByRole("button", { name: "Bu Ustayla Devam Et" }).click();
      await action().click(); await page.locator(".commerce-slot").first().click(); await action().click();
      await page.getByLabel("Mahalle, sokak, bina ve daire").fill("TEST Caferağa Mahallesi, Örnek Sokak No:10 Daire:2"); await action().click();
    };
    // Kart ve kapıda ödeme birlikte açıkken varsayılan online karttır.
    await toReview("&card&door");
    assert.equal(await page.getByRole("radio", { name: /Online kartla öde/ }).isChecked(), true, "card is the default when available");
    assert.equal(await page.getByRole("radio", { name: /Kapıda öde/ }).isChecked(), false, "pay at door is opt-in");
    await page.getByText("Paran, iş bitip sen onaylayana kadar ustaya geçmez", { exact: false }).first().waitFor();
    await shot("0-kart-varsayilan");
    // Hiçbir ödeme yöntemi açık değilse (canlı kart öncesi, kapıda ödeme kapalı) sipariş verilemez.
    await toReview("");
    assert.equal(await page.getByRole("radio").count(), 0, "no payment option offered while both are closed");
    await page.locator(".booking-payment-soon").getByText("Online ödeme açılışa hazırlanıyor", { exact: false }).waitFor();
    await page.getByRole("checkbox", { name: /Mesafeli Hizmet Sözleşmesi/ }).check(); await page.getByRole("checkbox", { name: /cayma süresi dolmadan/ }).check();
    assert.equal(await action().isDisabled(), true, "order cannot be placed without a payment method");
    assert.equal(placed, undefined, "nothing was sent");
    await fits("No payment"); await shot("0-odeme-yakinda");
    report.checks.push(`${width}px: card is the default when open; with card and pay-at-door both closed the order step shows the online payment notice and stays disabled`);
    await clearDrafts();
    await page.goto(`${base}/?screen=direct-purchase&door`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { level: 1 }).waitFor();
    await page.getByLabel("İlçe", { exact: true }).selectOption({ label: "Kadıköy" });
    await page.getByRole("button", { name: /Ekle$/ }).first().click();
    await page.getByRole("button", { name: "TEST · Cam silme (oda başına) ekle" }).click();
    await page.getByRole("button", { name: "TEST · Cam silme (oda başına) ekle" }).click();
    await page.getByRole("button", { name: "Bu Ustayla Devam Et" }).click();
    await page.locator("strong:visible", { hasText: "1.500" }).first().waitFor();
    await fits("Extras basket"); await shot("1-paket-ekstra");
    await action().click();
    await page.locator(".commerce-slot").first().click(); await fits("Slots"); await shot("2-saat");
    await action().click();
    await page.getByLabel("Mahalle, sokak, bina ve daire").fill("TEST Caferağa Mahallesi, Örnek Sokak No:10 Daire:2");
    await page.getByLabel(/Ustaya not/).fill("Zil bozuk, gelince arayın.");
    await shot("3-adres-not"); await action().click();
    assert.equal(await page.getByRole("radio", { name: /Kapıda öde/ }).isChecked(), true, "pay at door is selected when it is the only open method");
    assert.equal(await page.getByRole("radio", { name: /Online kartla öde/ }).count(), 0, "Card option hidden while closed");
    assert.equal(await action().isDisabled(), true, "Consent required");
    await page.locator("#on-bilgilendirme-formu").waitFor();
    assert.equal(await page.locator("#on-bilgilendirme-formu .legal-doc p").first().evaluate(el => getComputedStyle(el).fontSize), "16px", "pre-contract text is at least 12 pt");
    await page.getByRole("link", { name: "Ön Bilgilendirme Formu" }).click();
    assert.equal(await page.locator("#on-bilgilendirme-formu").evaluate(el => el.open), true, "link opens the form");
    for (const text of ["TEST Ahmet Yılmaz", "11111111110", "Melike Dağkesen (FUWU)", "Tüketici Hakem Heyetine", "m.15/1-h"]) assert.ok(await page.locator("#on-bilgilendirme-formu").getByText(text, { exact: false }).count(), text);
    await page.getByRole("checkbox", { name: /Mesafeli Hizmet Sözleşmesi/ }).check();
    assert.equal(await action().isDisabled(), true, "early start consent required for an appointment inside the withdrawal period");
    await page.getByRole("checkbox", { name: /cayma süresi dolmadan/ }).check();
    await fits("Review"); await shot("4-odeme-onay");
    await action().click();
    await page.waitForFunction(() => location.hash.includes("siparis=alindi"));
    assert.equal(placed.paymentMethod, "PAY_AT_DOOR"); assert.equal(placed.expectedTotalMinor, 150000); assert.equal(placed.note, "Zil bozuk, gelince arayın.");
    assert.equal(placed.addons, "80000000-0000-4000-8000-000000000001:1,80000000-0000-4000-8000-000000000002:2");
    assert.equal(placed.legalAccepted, true); assert.equal(placed.legalVersion, "mesafeli-hizmet-2026-11-24"); assert.equal(placed.earlyStartConsent, true);
    report.checks.push(`${width}px: package + 2 extras (1 toggle, 1 stepper ×2) → provider → slot → address/note → pay at door → pre-contract form (16 px) + contract acceptance + early-start consent → order placed with server-verified 1.500 TL basket`);
    for (const [screen, name] of [["door-order&placed", "5-musteri-siparis"], ["door-order&provider", "6-usta-siparis"]]) {
      await page.goto(`${base}/?screen=${screen}`, { waitUntil: "domcontentloaded" }); await page.getByRole("heading", { level: 1 }).waitFor(); await fits(name); await shot(name);
    }
    await page.goto(`${base}/?screen=door-order&placed`); await page.getByText("Siparişin alındı, randevun onaylandı.").waitFor(); await page.getByText("İş bitince ustana ödeyeceğin tutar").waitFor();
    await page.goto(`${base}/?screen=door-order&provider`); await page.getByText("Hizmet bitince müşteriden tahsil edeceğin tutar").waitFor(); await page.getByText("Müşterinin notu").waitFor();
    report.checks.push(`${width}px: customer confirmation and usta collection views show extras, note and amount due at the door`);
    await page.goto(`${base}/?screen=card-order`, { waitUntil: "domcontentloaded" }); await page.getByRole("heading", { level: 1 }).waitFor();
    const summary = page.locator(".commerce-summary");
    await summary.getByText("FUWU hizmet bedeli").waitFor(); assert.ok(await summary.getByText("+₺75", { exact: true }).count(), "customer receipt itemizes the FUWU service fee");
    assert.ok(await summary.getByText("₺1.575", { exact: false }).count(), "receipt total includes the fee");
    await fits("Card receipt"); await shot("7-kart-fis");
    report.checks.push(`${width}px: card order receipt itemizes package, extras and FUWU hizmet bedeli`);
    await context.close();
  }
  assert.deepEqual(report.errors, []);
  console.log(`PASS direct purchase UI: ${report.checks.length} checks, ${report.screenshots.length} screenshots → ${output}`);
} catch (error) { console.error(error.message, report.errors); process.exitCode = 1; }
finally { await fs.writeFile(path.join(output, "report.json"), JSON.stringify(report, null, 2)); await browser.close(); await server.close(); }
