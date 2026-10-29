import { expect,test } from "@playwright/test";
import { getTestAdminClient,loginWithEmailMagicLink,skipUnlessLocalSupabase } from "./helpers";

test.describe("commerce: real browser and isolated Auth/DB; no processor mock",()=>{
  test.beforeEach(()=>skipUnlessLocalSupabase());
  test("unauthenticated order/checkout and CSRF requests are denied",async({page})=>{
    await page.goto("/login");
    for(const route of ["/api/commerce/orders","/api/commerce/checkout"]) {
      const r=await page.request.post(route,{data:{}});expect(r.status()).toBe(401);
    }
    const forged=await page.request.post("/api/commerce/orders",{headers:{origin:"https://attacker.invalid"},data:{}});
    expect(forged.status()).toBe(403);
  });
  test("customer Auth session cannot enter admin or mutate invalid purchase data",async({page})=>{
    await loginWithEmailMagicLink(page,{nextPath:"/orders"});
    await expect(page).toHaveURL(/\/orders/);
    const order=await page.request.post("/api/commerce/orders",{data:{offeringId:"not-a-uuid"}});
    expect(order.status()).toBe(400);
    await page.goto("/admin");await expect(page).not.toHaveURL(/\/admin(?:$|\?)/);
  });
  test("authoritative quote, duplicate purchase hold and cancellation reach real SQL RPCs",async({page})=>{
    // A dedicated fixture offering ID must be provisioned in the isolated project.
    // No fallback to an arbitrary real provider or an existing customer's order.
    const offeringId=process.env.E2E_COMMERCE_OFFERING_ID,districtId=process.env.E2E_COMMERCE_DISTRICT_ID;
    test.skip(!offeringId||!districtId,"Dedicated synthetic commerce offering fixture is not provisioned");
    const admin=getTestAdminClient();
    const {data:provider,error}=await admin.from("provider_service_offerings").select("providers!inner(name)").eq("id",offeringId!).single();
    expect(error).toBeNull();expect(JSON.stringify(provider)).toContain("E2E ");
    await loginWithEmailMagicLink(page,{nextPath:"/services"});
    const quoteResponse=await page.request.get(`/api/commerce/quote?offering=${offeringId}`);
    expect(quoteResponse.status()).toBe(200);const {quote}=await quoteResponse.json();
    const day=new Date(Date.now()+7*86400000).toISOString().slice(0,10);
    const slotsResponse=await page.request.get(`/api/commerce/slots?offering=${offeringId}&day=${day}&district=${districtId}`);
    expect(slotsResponse.ok()).toBe(true);const {slots}=await slotsResponse.json();expect(slots.length).toBeGreaterThan(0);
    const payload={offeringId,districtId,startsAt:slots[0].starts_at,address:"E2E sentetik test adresi 10",idempotencyKey:crypto.randomUUID(),expectedPriceMinor:quote.service_price_minor,expectedTotalMinor:quote.total_minor,feeConsent:true,termsVersion:quote.terms_version};
    const first=await page.request.post("/api/commerce/orders",{data:payload});expect(first.status()).toBe(201);
    const {order}=await first.json();
    const second=await page.request.post("/api/commerce/orders",{data:payload});expect(second.status()).toBe(201);expect((await second.json()).order.id).toBe(order.id);
    const cancel=await page.request.post(`/api/commerce/orders/${order.id}`,{data:{status:"CANCELLED"}});expect(cancel.status()).toBe(200);
    const {data:row}=await admin.from("orders").select("status").eq("id",order.id).single();expect(row?.status).toBe("CANCELLED");
  });
});
