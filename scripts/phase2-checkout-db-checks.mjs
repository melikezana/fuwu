import assert from "node:assert/strict";
import crypto from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

export async function phase2CheckoutChecks({ root, a, b, p, p2, service, guest, pid, scalar, check }) {
  const district = "20000000-0000-4000-8000-000000000001";
  const serviceId = await scalar(root, "select id from service_catalog where slug='musluk-montaji'");
  const hours = Array.from({ length: 7 }, (_, weekday) => ({ weekday, starts_at: "09:00", ends_at: "18:00" }));
  const offering = { service_id: serviceId, variant_id: null, price_minor: 200000, duration_minutes: 60, district_ids: [district], is_active: true };
  for (const [db, provider, price] of [[p, pid(1), 200000], [p2, pid(2), 240000]]) {
    await root.query("update providers set is_active=true,is_approved=true,availability='müsait',iyzico_submerchant_status='active',iyzico_submerchant_key=$2,category_id=(select category_id from service_catalog where id=$3) where id=$1", [provider, `sandbox-snapshot-${provider}`, serviceId]);
    await db.query("select commerce_save_store($1,$2,$3,'[]')", [provider, JSON.stringify([{ ...offering, price_minor: price }]), JSON.stringify(hours)]);
  }
  const fid = await scalar(root, "select id from provider_service_offerings where provider_id=$1 and service_id=$2", [pid(1), serviceId]);
  const secondFid = await scalar(root, "select id from provider_service_offerings where provider_id=$1 and service_id=$2", [pid(2), serviceId]);
  const day = await scalar(root, "select ((clock_timestamp() at time zone 'Europe/Istanbul')::date+8)::text");
  const slots = (db, id = fid) => db.query("select * from commerce_slots($1,$2,$3)", [id, day, district]);
  const available = (await slots(guest)).rows;
  assert.ok(available.length > 12);
  const hold = (db, index, id = fid, price = 200000) => scalar(db, "select commerce_hold_order($1,$2,$3,$4,$5,$6)", [id, available[index].starts_at, district, "TEST Phase 2 Adresi Sokak No 12", crypto.randomUUID(), price]);

  await check("Phase 2: same service retains two provider prices and exact 2000/200/1800 TRY split", async () => {
    const offers = await scalar(guest, "select commerce_offers($1,$2)", [serviceId, district]);
    assert.equal(offers.find(o => o.provider_id === pid(1)).price_minor, 200000);
    assert.equal(offers.find(o => o.provider_id === pid(2)).price_minor, 240000);
    const order = await hold(a, 0); const other = await hold(b, 0, secondFid, 240000);
    assert.equal(order.provider_id, pid(1)); assert.equal(other.provider_id, pid(2));
    assert.equal(order.total_minor, 200000); assert.equal(order.commission_minor, 20000); assert.equal(order.provider_gross_minor, 180000);
    await root.query("update orders set status='CANCELLED' where id=any($1::uuid[])", [[order.id, other.id]]);
  });
  await check("Phase 2: initializer freezes the submerchant identity despite later provider profile edits", async () => {
    const order = await hold(a, 0);
    const claim = await scalar(service, "select commerce_begin_payment($1)", [order.id]);
    assert.equal(claim.claimed, true); assert.equal(claim.submerchant_key, `sandbox-snapshot-${pid(1)}`);
    await root.query("update providers set iyzico_submerchant_key='sandbox-changed-later' where id=$1", [pid(1)]);
    const retry = await scalar(service, "select commerce_begin_payment($1)", [order.id]);
    assert.equal(retry.claimed, false); assert.equal(retry.submerchant_key, claim.submerchant_key);
    await root.query("update orders set status='CANCELLED' where id=$1", [order.id]);
  });
  await check("Phase 2: callback started before expiry but blocked on provider lock refunds after expiry", async () => {
    const order = await hold(a, 4);
    await service.query("select commerce_begin_payment($1)", [order.id]);
    await service.query("select commerce_attach_payment($1,'phase2-stale-clock-token','https://sandbox-cpp.iyzipay.com/test')", [order.id]);
    await root.query("update orders set expires_at=clock_timestamp()+interval '350 milliseconds' where id=$1", [order.id]);
    await root.query("begin"); await root.query("select id from providers where id=$1 for update", [pid(1)]);
    await service.query("begin");
    const pending = scalar(service, "select commerce_resolve_payment($1,'phase2-stale-clock-token','phase2-stale-payment',true,null,'phase2-stale-item')", [order.id]);
    await delay(500); await root.query("commit");
    assert.equal(await pending, "REFUND_PENDING"); await service.query("commit");
    assert.equal(await scalar(root, "select payment_status from orders where id=$1", [order.id]), "REFUND_PENDING");
    assert.ok((await slots(guest)).rows.some(s => Date.parse(s.starts_at) === Date.parse(order.starts_at)));
  });
  await check("Phase 2: payment initializer cannot revive a hold after waiting on a provider lock", async () => {
    const order = await hold(a, 8);
    await root.query("update orders set expires_at=clock_timestamp()+interval '350 milliseconds' where id=$1", [order.id]);
    await root.query("begin"); await root.query("select id from providers where id=$1 for update", [pid(1)]);
    await service.query("begin");
    const pending = scalar(service, "select commerce_begin_payment($1)", [order.id]);
    const denied = assert.rejects(pending, /hold_expired/);
    await delay(500); await root.query("commit"); await denied; await service.query("rollback");
    assert.equal(await scalar(root, "select count(*)::int from payment_transactions where order_id=$1", [order.id]), 0);
  });
}
