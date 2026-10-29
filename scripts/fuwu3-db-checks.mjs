import { finishVerified } from "./backend-reliability-db-checks.mjs";
import assert from "node:assert/strict";
import crypto from "node:crypto";

export async function fuwu3Checks({ root, a, b, p, p2, admin, service, guest, pid, scalar, check }) {
  const district = "20000000-0000-4000-8000-000000000001";
  const offering = await scalar(root, "select id from provider_service_offerings where provider_id=$1 and variant_id is null limit 1", [pid(1)]);
  const category = await scalar(root, "select c.category_id from provider_service_offerings f join service_catalog c on c.id=f.service_id where f.id=$1", [offering]);
  const day = await scalar(root, "select ((clock_timestamp() at time zone 'Europe/Istanbul')::date+20)::text");
  // These are exclusively disposable test rows. No remote connection or project env file is used.
  await root.query("update orders set status='CANCELLED' where status='PENDING_PAYMENT'");
  await root.query("update providers set daily_order_limit=null where id=$1", [pid(1)]);
  await root.query("insert into app_settings(key,value) values('commission_rate','10'),('customer_fee_rate','0') on conflict(key) do update set value=excluded.value");
  const slots = () => guest.query("select * from commerce_slots($1,$2,$3)", [offering, day, district]);
  const times = (await slots()).rows;
  assert.ok(times.length > 8);
  const reserve = (db, index, total = 200000, consent = false, key = crypto.randomUUID()) => scalar(db, "select commerce_hold_order_priced($1,$2,$3,$4,$5,200000,$6,$7,'fuwu-fees-v1')", [offering, times[index].starts_at, district, "TEST FUWU3 Açık Adres Sokak No 30", key, total, consent]);
  const cancel = order => root.query("update orders set status='CANCELLED' where id=$1", [order.id]);

  await check("FUWU3: category visibility and presentation are admin-only and preserve custom categories without offerings", async () => {
    const id = crypto.randomUUID();
    await root.query("insert into service_categories(id,name,slug) values($1,'TEST Özel Kategori','test-ozel-kategori')", [id]);
    await assert.rejects(a.query("select commerce_admin_save_category($1,'İsim','test-isim',true,true,1,'wrench')", [id]), /forbidden/);
    await admin.query("select commerce_admin_save_category($1,'TEST Özel Kategori','test-ozel-kategori',true,true,2,'wrench')", [id]);
    assert.equal(await scalar(guest, "select count(*)::int from service_categories where id=$1 and is_visible and is_featured and sort_order=2", [id]), 1);
    assert.equal(await scalar(root, "select count(*)::int from service_catalog where category_id=$1", [id]), 0);
    assert.ok(await scalar(admin, "select count(*)::int from audit_logs where entity_id=$1 and action='category.presentation_updated'", [id]));
  });
  await check("FUWU3: hidden category exposes no offers, quotes or bookable slots", async () => {
    await root.query("update service_categories set is_visible=false where id=$1", [category]);
    assert.deepEqual(await scalar(guest, "select commerce_offers(null,null,$1)", [pid(1)]), []);
    assert.equal((await slots()).rows.length, 0);
    await assert.rejects(guest.query("select commerce_quote($1)", [offering]), /offering_unavailable/);
    await root.query("update service_categories set is_visible=true where id=$1", [category]);
  });
  await check("FUWU3: database rejects negative, over-100, blank and overprecision rates", async () => {
    for (const key of ["commission_rate", "customer_fee_rate"]) for (const value of ["-1", "101", "", "NaN", "1.999", "1e2"]) await assert.rejects(root.query("update app_settings set value=$2 where key=$1", [key, value]), /invalid_fee_rate/);
  });
  await check("FUWU3: default zero customer fee and 1 percent provider rate have unambiguous basis points", async () => {
    let q = await scalar(guest, "select commerce_quote($1)", [offering]);
    assert.equal(q.customer_fee_minor, 0); assert.equal(q.total_minor, 200000); assert.equal(q.commission_minor, 20000);
    await root.query("update app_settings set value='1' where key='commission_rate'");
    q = await scalar(guest, "select commerce_quote($1)", [offering]); assert.equal(q.provider_commission_bps, 100); assert.equal(q.commission_minor, 2000);
    await root.query("update app_settings set value='10' where key='commission_rate'");
  });
  await check("FUWU3: 2000 TRY service + 5 percent customer fee = 2100 collected, 1800 provider, 300 platform", async () => {
    await root.query("update app_settings set value='5' where key='customer_fee_rate'");
    const q = await scalar(guest, "select commerce_quote($1)", [offering]);
    assert.deepEqual(q, { service_price_minor: 200000, customer_fee_minor: 10000, total_minor: 210000, commission_minor: 20000, provider_gross_minor: 180000, provider_commission_bps: 1000, customer_fee_bps: 500, terms_version: "fuwu-fees-v1" });
  });
  await check("FUWU3: stale totals, missing consent and legacy zero-fee clients cannot create a charged order", async () => {
    await assert.rejects(reserve(a, 0, 200000, true), /fee_changed/);
    await assert.rejects(reserve(a, 0, 210000, false), /fee_consent_required/);
    await assert.rejects(a.query("select commerce_hold_order($1,$2,$3,$4,$5,200000)", [offering, times[0].starts_at, district, "TEST FUWU3 Adres No 30", crypto.randomUUID()]), /fee_changed/);
    await assert.rejects(guest.query("select commerce_hold_order_priced($1,$2,$3,$4,$5,200000,210000,true,'fuwu-fees-v1')", [offering, times[0].starts_at, district, "TEST FUWU3 Adres No 30", crypto.randomUUID()]), /permission denied/);
  });
  let order;
  const key = crypto.randomUUID();
  await check("FUWU3: server stores consent time, applied rates and immutable price; a retry retains the same snapshot", async () => {
    order = await reserve(a, 0, 210000, true, key);
    assert.equal(order.customer_fee_minor, 10000); assert.equal(order.service_price_minor, 200000); assert.equal(order.customer_fee_bps, 500); assert.ok(order.fee_consent_at);
    await root.query("update app_settings set value='0' where key='customer_fee_rate'");
    const retry = await reserve(a, 0, 210000, true, key); assert.deepEqual(retry, order);
    await assert.rejects(root.query("update orders set total_minor=total_minor+1 where id=$1", [order.id]), /immutable_order_price/);
    assert.ok(await scalar(admin, "select count(*)::int from audit_logs where action='commerce.fee_changed'"));
  });
  await check("FUWU3: sandbox finance separates service GMV, customer charge, two revenues and unknown costs", async () => {
    const before = await scalar(admin, "select commerce_admin_summary()");
    await service.query("select commerce_begin_payment($1)", [order.id]);
    await service.query("select commerce_attach_payment($1,'fuwu3-token','https://sandbox-cpp.iyzipay.com/test')", [order.id]);
    assert.equal(await scalar(service, "select commerce_resolve_payment($1,'fuwu3-token','fuwu3-payment',true,null,'fuwu3-item')", [order.id]), "CONFIRMED");
    const notEarned = await scalar(admin, "select commerce_admin_summary()"); assert.equal(notEarned.platform_gross_minor, before.platform_gross_minor);
    await root.query("update orders set status='COMPLETED' where id=$1", [order.id]);
    const after = await scalar(admin, "select commerce_admin_summary()");
    assert.equal(after.gmv_minor - before.gmv_minor, 200000); assert.equal(after.customer_collected_minor - before.customer_collected_minor, 210000);
    assert.equal(after.commission_minor - before.commission_minor, 20000); assert.equal(after.customer_fee_minor - before.customer_fee_minor, 10000); assert.equal(after.platform_gross_minor - before.platform_gross_minor, 30000);
    assert.equal(after.net_contribution_minor, null); assert.equal(after.environment, "sandbox");
  });
  await check("FUWU3: full refund includes the customer platform fee and removes unrealized earnings", async () => {
    const before = await scalar(admin, "select commerce_admin_summary()");
    await a.query("select commerce_transition_order($1,'DISPUTED',null)", [order.id]);
    await admin.query("select commerce_admin_request_refund($1)", [order.id]);
    const claim = await scalar(service, "select commerce_claim_settlement($1,'refund')", [order.id]); assert.equal(claim.total_minor, 210000);
    await finishVerified(service,order.id,"refund");
    const after = await scalar(admin, "select commerce_admin_summary()");
    assert.equal(after.refunded_minor - before.refunded_minor, 210000); assert.equal(before.platform_gross_minor - after.platform_gross_minor, 30000);
    const own = await scalar(p, "select commerce_provider_finance($1)", [pid(1)]); assert.ok(own.refunded_service_minor >= 200000); assert.ok(own.unconfirmed_provider_fee_count >= 0);
  });
  await check("FUWU3: category rates override defaults without editing historical snapshots", async () => {
    await root.query("update service_categories set customer_fee_bps=750,provider_commission_bps=2000 where id=$1", [category]);
    const q = await scalar(guest, "select commerce_quote($1)", [offering]); assert.equal(q.customer_fee_minor, 15000); assert.equal(q.commission_minor, 40000);
    assert.equal(await scalar(root, "select customer_fee_bps from orders where id=$1", [order.id]), 500);
    assert.ok(await scalar(admin, "select count(*)::int from audit_logs where entity_id=$1 and action='commerce.category_fee_changed'", [category]));
    await root.query("update service_categories set customer_fee_bps=null,provider_commission_bps=null where id=$1", [category]);
  });
  await check("FUWU3: daily capacity is owner-only and two concurrent non-overlapping holds cannot exceed it", async () => {
    await assert.rejects(a.query("select commerce_set_daily_limit($1,1)", [pid(1)]), /forbidden/);
    await assert.rejects(p2.query("select commerce_set_daily_limit($1,1)", [pid(1)]), /forbidden/);
    for (const n of [0, -1, 31]) await assert.rejects(p.query("select commerce_set_daily_limit($1,$2)", [pid(1), n]), /invalid_capacity/);
    await p.query("select commerce_set_daily_limit($1,1)", [pid(1)]);
    const attempts = await Promise.allSettled([reserve(a, 0), reserve(b, 8)]);
    assert.equal(attempts.filter(r => r.status === "fulfilled").length, 1);
    assert.equal((await slots()).rows.length, 0);
    const won = attempts.find(r => r.status === "fulfilled").value;
    await cancel(won); assert.ok((await slots()).rows.length > 0);
    await root.query("update providers set daily_order_limit=null where id=$1", [pid(1)]);
  });
  await check("FUWU3: CEO insights use real category, district and repeat-service aggregates with role isolation", async () => {
    for (const db of [a, p]) await assert.rejects(db.query("select commerce_ceo_insights()"), /forbidden/);
    await assert.rejects(guest.query("select commerce_ceo_insights()"), /permission denied/);
    const sid = await scalar(root, "select service_id from provider_service_offerings where id=$1", [offering]);
    await root.query("update service_catalog set name='TEST Güncel Hizmet Adı' where id=$1", [sid]);
    const report = await scalar(admin, "select commerce_ceo_insights()");
    assert.equal(report.repeat_services.filter(row => row.service_id === sid).length, 1);
    assert.equal(report.repeat_services.find(row => row.service_id === sid).name, "TEST Güncel Hizmet Adı"); assert.equal(report.environment, "sandbox");
    assert.ok(report.categories.some(row => row.name === "TEST Özel Kategori" && row.offering_providers === 0)); assert.ok(report.districts.length); assert.ok(Array.isArray(report.repeat_services));
  });
}
