import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { ensureTestUserRole, getTestAdminClient, loginWithEmailMagicLink, skipUnlessLocalSupabase, uniqueE2EEmail } from "./helpers";
test.describe("provider control: isolated real Supabase acceptance", () => {
 test.beforeEach(() => skipUnlessLocalSupabase());
 test("unpublish satisfies all six acceptance conditions", async ({ page, browser }) => {
  const admin = getTestAdminClient(); // Throws on production/non-allowlisted URLs.
  const email = uniqueE2EEmail("control-admin");
  await ensureTestUserRole(email, "admin");
  const owner = await ensureTestUserRole(uniqueE2EEmail("control-provider"), "provider");
  const id = crypto.randomUUID(), name = `E2E Control ${id.slice(0, 8)}`;
  const { data: category, error: categoryError } = await admin.from("service_categories").select("id").eq("is_active", true).limit(1).single();
  const { data: district, error: districtError } = await admin.from("districts").select("id").eq("is_active", true).limit(1).single();
  expect(categoryError).toBeNull(); expect(districtError).toBeNull();
  const insert = await admin.from("providers").insert({ id, user_id: owner, name, phone: "+905550000001", description: "E2E dedicated synthetic provider profile for publication acceptance.", category_id: category!.id, district_id: district!.id, is_active: true, is_approved: true });
  expect(insert.error).toBeNull();
  const classify = await admin.from("provider_publication_reviews").update({ status: "approved", record_kind: "real" }).eq("provider_id", id);
  expect(classify.error).toBeNull();
  const publicContext = await browser.newContext();
  const publicPage = await publicContext.newPage();
  await publicPage.goto("/providers"); await expect(publicPage.getByText(name, { exact: true }).first()).toBeVisible();
  await loginWithEmailMagicLink(page, { email, role: "admin", nextPath: `/admin/providers?id=${id}` });
  await page.goto(`/admin/providers?id=${id}`);
  await page.getByRole("button", { name: "Yayından Kaldır", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(name);
  await page.getByLabel("Kısa gerekçe").fill("E2E verified test profile is withdrawn from public view.");
  await page.getByRole("button", { name: "Yayından Kaldır · Onayla", exact: true }).dblclick();
  await expect(page.getByRole("status").filter({ hasText: "Usta yayından kaldırıldı." })).toBeVisible();
  // 1. Database publication changes; account and ownership survive.
  const { data: q } = await admin.from("provider_publication_reviews").select("status").eq("provider_id", id).single();
  const { data: p } = await admin.from("providers").select("is_active,is_approved,user_id").eq("id", id).single();
  expect(q?.status).toBe("hidden"); expect(p).toMatchObject({ is_active: true, is_approved: true, user_id: owner });
  // 2. Badge comes from the committed database read.
  await expect(page.locator(".control-badge")).toHaveText("Yayından kaldırıldı");
  // 3. Public list no longer contains the provider.
  await publicPage.goto("/providers"); await expect(publicPage.getByText(name, { exact: true })).toHaveCount(0);
  // 4. Direct public URL also follows the policy.
  const profileResponse = await publicPage.goto(`/providers/${id}`); expect(profileResponse?.status()).toBe(404);
  // 5. Exactly one audit decision after a double click.
  const { data: audits, error: auditError } = await admin.from("audit_logs").select("id").eq("entity_id", id).eq("action", "provider.control.unpublish");
  expect(auditError).toBeNull(); expect(audits).toHaveLength(1);
  // 6. Anonymous/unauthorized client cannot execute the same mutation.
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const denied = await anon.rpc("admin_provider_action", { p_provider_id: id, p_action: "unpublish", p_reason: "E2E unauthorized attempt denied", p_expected_version: "a".repeat(32), p_request_id: crypto.randomUUID() });
  expect(denied.error).not.toBeNull();
  await publicContext.close();
  // Keep the synthetic audited record hidden. No cascade cleanup of users/orders/storage.
 });
 test("partner saves price, scope and calendar and cannot edit another provider", async ({ page }) => {
  const admin = getTestAdminClient(), email = uniqueE2EEmail("partner-preparation");
  const owner = await ensureTestUserRole(email, "provider"), other = await ensureTestUserRole(uniqueE2EEmail("other-partner"), "provider");
  const { data: category } = await admin.from("service_categories").select("id").eq("is_active", true).limit(1).single();
  const { data: district } = await admin.from("districts").select("id,name").eq("is_active", true).limit(1).single();
  expect(category).not.toBeNull(); expect(district).not.toBeNull();
  const id = crypto.randomUUID(), otherId = crypto.randomUUID(), serviceId = crypto.randomUUID(), serviceName = `E2E Service ${serviceId.slice(0, 8)}`;
  for (const [pid, userId] of [[id, owner], [otherId, other]]) {
   const { error } = await admin.from("providers").insert({ id: pid, user_id: userId, name: `E2E Partner ${pid.slice(0, 8)}`, phone: "+905550000004", description: "E2E factual dedicated provider for preparation test.", category_id: category!.id, district_id: district!.id, is_active: true, is_approved: true }); expect(error).toBeNull();
  }
  const service = await admin.from("service_catalog").insert({ id: serviceId, category_id: category!.id, slug: `e2e-${serviceId}`, name: serviceName, description: "E2E dedicated service description.", scope: "E2E baseline scope.", image_url: "/test.png", pricing_type: "FIXED_PRICE", is_active: true }); expect(service.error).toBeNull();
  await loginWithEmailMagicLink(page, { email, role: "provider", nextPath: "/provider-dashboard/store" });
  await page.goto("/provider-dashboard/store");
  const offering = page.locator(".commerce-store-offering").filter({ has: page.getByRole("heading", { name: serviceName, exact: true }) });
  await offering.getByLabel("Fiyat (TL)").fill("850"); await offering.getByLabel("Süre", { exact: true }).selectOption("60");
  await offering.getByLabel("Hizmet kapsamı").fill("E2E provider-defined factual service scope."); await offering.getByRole("checkbox", { name: "Hazır", exact: true }).check();
  await page.getByRole("checkbox", { name: district!.name, exact: true }).check(); await page.getByRole("checkbox", { name: "Pazartesi", exact: true }).check();
  await page.getByRole("button", { name: "Hizmetlerimi Kaydet", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Hizmetlerin ve çalışma takvimin kaydedildi." })).toBeVisible();
  const { data: saved } = await admin.from("provider_service_offerings").select("price_minor,duration_minutes,scope,district_ids").eq("provider_id", id).eq("service_id", serviceId).single();
  expect(saved).toMatchObject({ price_minor: 85000, duration_minutes: 60, scope: "E2E provider-defined factual service scope.", district_ids: [district!.id] });
  await page.goto("/provider-dashboard/calendar"); await page.getByLabel("Pazartesi başlangıç", { exact: true }).fill("10:00");
  await page.getByRole("button", { name: "Takvimimi Kaydet", exact: true }).click(); await expect(page.getByRole("status").filter({ hasText: "Hizmetlerin ve çalışma takvimin kaydedildi." })).toBeVisible();
  const { data: hours } = await admin.from("provider_availability").select("starts_at").eq("provider_id", id).eq("weekday", 1).single(); expect(hours?.starts_at).toBe("10:00:00");
  const denied = await page.request.post("/api/commerce/store", { data: { providerId: otherId, offerings: [], hours: [], daysOff: [] } }); expect(denied.status()).toBe(403);
  await page.goto("/provider-dashboard"); await expect(page.getByRole("heading", { name: "İşin burada.", exact: true })).toBeVisible();
  await expect(page.getByText("Profil Tamamlama", { exact: true })).toBeVisible(); await expect(page.getByText("Belge Doğrulama", { exact: true })).toBeVisible();
 });
});
