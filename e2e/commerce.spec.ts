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
    expect(order.status()).toBe(400); expect((await order.json()).error).toBe("invalid_selection");
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
    // Doğrudan satın alma (geçici kapıda ödeme açıkken): sipariş API'den tek adımda oluşur ve randevu hemen onaylanır.
    const door={offeringId,districtId,startsAt:slots[slots.length-1].starts_at,address:"E2E sentetik test adresi 11",idempotencyKey:crypto.randomUUID(),expectedTotalMinor:quote.total_minor,feeConsent:true,termsVersion:quote.terms_version,paymentMethod:"PAY_AT_DOOR",note:"E2E notu",legalAccepted:true,legalVersion:"mesafeli-hizmet-2026-11-24",earlyStartConsent:true};
    const legal=await page.request.get(`/api/commerce/legal?offering=${offeringId}`);expect(legal.status()).toBe(200);
    expect((await legal.json()).legal).toMatchObject({ready:true,version:"mesafeli-hizmet-2026-11-24",provider:{tax_id:"11111111110"}});
    const unaccepted=await page.request.post("/api/commerce/orders",{data:{...door,legalAccepted:false}});expect(unaccepted.status()).toBe(400);
    // Ödeme online karttır; kapıda ödeme yalnızca admin geçici olarak açarsa kabul edilir (varsayılan kapalı).
    const closed=await page.request.post("/api/commerce/orders",{data:door});expect(closed.status()).toBe(503);expect((await closed.json()).error).toBe("pay_at_door_closed");
    expect((await admin.from("app_settings").upsert({key:"pay_at_door_enabled",value:"true"})).error).toBeNull();
    const placed=await page.request.post("/api/commerce/orders",{data:door});expect(placed.status()).toBe(201);
    const {order:doorOrder}=await placed.json();expect(doorOrder).toMatchObject({status:"CONFIRMED",payment_status:"UNPAID",payment_method:"PAY_AT_DOOR",customer_note:"E2E notu",legal_version:"mesafeli-hizmet-2026-11-24"});expect(doorOrder.legal_parties.provider.tax_id).toBe("11111111110");
    const documents=await page.goto(`/orders/${doorOrder.id}/belgeler`);expect(documents?.status()).toBe(200);await expect(page.getByRole("heading",{name:"Ön Bilgilendirme Formu",exact:true})).toBeVisible();
    const again=await page.request.post("/api/commerce/orders",{data:door});expect(again.status()).toBe(201);expect((await again.json()).order.id).toBe(doorOrder.id);
    const card=await page.request.post("/api/commerce/checkout",{data:{orderId:doorOrder.id}});expect(card.status()).not.toBe(200);
    const cancelDoor=await page.request.post(`/api/commerce/orders/${doorOrder.id}`,{data:{status:"CANCELLED"}});expect(cancelDoor.status()).toBe(200);
    expect((await admin.from("app_settings").upsert({key:"pay_at_door_enabled",value:"false"})).error).toBeNull();
  });
});
