import { expect, test } from "./fixtures";
import { getTestAdminClient, loginWithEmailMagicLink, skipUnlessLocalSupabase, createCommerceFixture, ensureTestUserRole, uniqueE2EEmail } from "./helpers";
// Prepared synthetic appointment, isolated allowlisted Supabase only. Never select an arbitrary order.
test("FUWU Güvence: assigned provider arrival, completion report, explicit customer confirmation without GPS", async ({ browser }) => {
 skipUnlessLocalSupabase();
 const customer=uniqueE2EEmail("trust-customer"), provider=uniqueE2EEmail("trust-provider");
 const customerId=await ensureTestUserRole(customer,"customer"), owner=await ensureTestUserRole(provider,"provider");
 const prepared=await createCommerceFixture(owner), id=crypto.randomUUID(), db=getTestAdminClient();
 const insert=await db.from("commerce_orders").insert({id,customer_id:customerId,provider_id:prepared.provider.id,offering_id:prepared.offeringId,service_name:"E2E Synthetic Trust Appointment",scope:"E2E synthetic service scope",provider_name:prepared.provider.name,district_id:prepared.districtId,district_name:"E2E District",address:"E2E isolated synthetic address 10",starts_at:new Date(Date.now()-5*60000).toISOString(),ends_at:new Date(Date.now()+55*60000).toISOString(),total_minor:85000,commission_minor:8500,provider_gross_minor:76500,status:"CONFIRMED",payment_status:"PAID",expires_at:new Date(Date.now()+3600000).toISOString(),idempotency_key:crypto.randomUUID()});
 expect(insert.error).toBeNull();
 const fixture = await db.from("commerce_orders").select("id,customer_id,provider_id,service_name,provider_name,status,starts_at").eq("id", id!).single();
 expect(fixture.error).toBeNull(); expect(fixture.data?.service_name).toMatch(/^E2E /); expect(fixture.data?.provider_name).toMatch(/^E2E /);
 expect(fixture.data?.status).toBe("CONFIRMED"); expect(Math.abs(Date.parse(fixture.data!.starts_at) - Date.now())).toBeLessThan(3600000);
 const providerUser = await db.from("providers").select("user_id").eq("id", fixture.data!.provider_id).single(); expect(providerUser.error).toBeNull(); expect(providerUser.data?.user_id).toBeTruthy();
 const customerContext = await browser.newContext({ permissions: [] }), providerContext = await browser.newContext({ permissions: [] });
 try {
  const c = await customerContext.newPage(), p = await providerContext.newPage();
  await loginWithEmailMagicLink(c, { email: customer!, existingUserId: fixture.data!.customer_id, nextPath: `/orders/${id}` });
  await loginWithEmailMagicLink(p, { email: provider!, existingUserId: providerUser.data!.user_id!, role: "provider", nextPath: `/orders/${id}` });
  await p.getByRole("button", { name: "Yola Çıktım", exact: true }).click();
  await c.reload(); await c.getByRole("button", { name: "Kapı kodu oluştur", exact: true }).click();
  const code = (await c.getByLabel("Kapı kodun").textContent()) || ""; expect(code).toMatch(/^\d{6}$/);
  await p.getByLabel("Müşterinin altı haneli kapı kodu").fill(code);
  await p.getByRole("button", { name: "Hizmete Başladım", exact: true }).click();
  await expect(p.getByRole("heading", { name: "Hizmet devam ediyor", exact: true })).toBeVisible();
  await p.getByRole("button", { name: "Hizmeti Tamamla", exact: true }).click();
  await expect(p.getByRole("heading", { name: "Müşteri onayı bekleniyor", exact: true })).toBeVisible();
  const pending = await db.from("commerce_orders").select("status,customer_confirmed_at").eq("id", id!).single(); expect(pending.data?.status).toBe("IN_PROGRESS"); expect(pending.data?.customer_confirmed_at).toBeNull();
  await c.reload(); await c.getByRole("button", { name: "Hizmeti Onayla", exact: true }).click();
  await expect(c.getByRole("heading", { name: "Hizmet tamamlandı", exact: true }).first()).toBeVisible();
  const confirmed = await db.from("commerce_orders").select("status,customer_confirmed_at").eq("id", id!).single(); expect(confirmed.data?.status).toBe("COMPLETED"); expect(confirmed.data?.customer_confirmed_at).not.toBeNull();
 } finally { await customerContext.close(); await providerContext.close(); }
});
