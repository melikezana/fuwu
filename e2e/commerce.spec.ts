import { expect,test } from "./fixtures";
import { getTestAdminClient,loginWithEmailMagicLink,skipUnlessLocalSupabase, authenticatedTestClient, createCommerceFixture, ensureTestUserRole, uniqueE2EEmail } from "./helpers";

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
    expect(order.status()).toBe(503); expect((await order.json()).error).toBe("online_purchase_closed");
    await page.goto("/admin");await expect(page).not.toHaveURL(/\/admin(?:$|\?)/);
  });
  test("authoritative quote, duplicate purchase hold and cancellation reach real SQL RPCs",async({page})=>{
    const owner=await ensureTestUserRole(uniqueE2EEmail("commerce-owner"),"provider");
    const {offeringId,districtId}=await createCommerceFixture(owner);
    const admin=getTestAdminClient();
    await loginWithEmailMagicLink(page,{nextPath:"/services"});
    const actor=await authenticatedTestClient(page);
    const quoteResponse=await page.request.get(`/api/commerce/quote?offering=${offeringId}`);
    expect(quoteResponse.status()).toBe(200);const {quote}=await quoteResponse.json();
    const day=new Date(Date.now()+7*86400000).toISOString().slice(0,10);
    const slotsResponse=await page.request.get(`/api/commerce/slots?offering=${offeringId}&day=${day}&district=${districtId}`);
    expect(slotsResponse.ok()).toBe(true);const {slots}=await slotsResponse.json();expect(slots.length).toBeGreaterThan(0);
    const payload={offeringId,districtId,startsAt:slots[0].starts_at,address:"E2E sentetik test adresi 10",idempotencyKey:crypto.randomUUID(),expectedPriceMinor:quote.service_price_minor,expectedTotalMinor:quote.total_minor,feeConsent:true,termsVersion:quote.terms_version};
    const args={p_offering_id:offeringId,p_district_id:districtId,p_starts_at:payload.startsAt,p_address:payload.address,p_idempotency_key:payload.idempotencyKey,p_expected_price_minor:payload.expectedPriceMinor,p_expected_total_minor:payload.expectedTotalMinor,p_fee_consent:true,p_terms_version:payload.termsVersion};
    const first=await actor.rpc("commerce_hold_order_priced",args);expect(first.error).toBeNull();
    const order=first.data;
    const second=await actor.rpc("commerce_hold_order_priced",args);expect(second.error).toBeNull();expect(second.data.id).toBe(order.id);
    const cancel=await page.request.post(`/api/commerce/orders/${order.id}`,{data:{status:"CANCELLED"}});expect(cancel.status()).toBe(200);
    const {data:row}=await admin.from("commerce_orders").select("status").eq("id",order.id).single();expect(row?.status).toBe("CANCELLED");
  });
});
