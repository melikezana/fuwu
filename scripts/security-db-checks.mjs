import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

export async function securityDatabaseChecks({root,a,b,p,p2,admin,service,guest,scalar,check,client,uid,winner}) {
  await check("Security: 12 concurrent atomic rate consumptions allow exactly three and cannot be reset by browser",async()=>{
    const sessions=await Promise.all(Array.from({length:12},()=>client("authenticated",uid(1))));
    const rows=await Promise.all(sessions.map(c=>scalar(c,"select consume_user_rate_limit('TEST:atomic',3,86400000)")));
    assert.equal(rows.filter(r=>r.allowed).length,3);
    assert.equal(await scalar(root,"select count from rate_limits where user_id=$1 and action='TEST:atomic'",[uid(1)]),12);
    for(const sql of ["update rate_limits set count=0","delete from rate_limits"]) await assert.rejects(a.query(sql),/permission denied/);
    await assert.rejects(guest.query("select consume_user_rate_limit('TEST:atomic',3,1000)"),/permission denied/);
    await assert.rejects(a.query("select consume_user_rate_limit('TEST:atomic',0,1000)"),/invalid_rate_limit/);
  });
  const offering = (await root.query("select * from provider_service_offerings where id=$1", [winner.offering_id])).rows[0];
  await root.query("update providers set daily_order_limit=30 where id=$1", [winner.provider_id]);
  await root.query("update provider_service_offerings set is_active=true where id=$1", [offering.id]);
  const day = await scalar(root, "select ((now() at time zone 'Europe/Istanbul')::date+14)::text");
  const slot = (await guest.query("select * from commerce_slots($1,$2,$3)", [offering.id, day, winner.district_id])).rows[0];
  assert.ok(slot, "synthetic race slot exists");
  const quote = await scalar(a, "select commerce_quote($1)", [offering.id]);
  const hold = (c, key) => scalar(c, "select commerce_hold_order_priced($1,$2,$3,$4,$5,$6,$7,true,$8)", [offering.id,slot.starts_at,winner.district_id,"TEST isolated concurrency address",key,quote.service_price_minor,quote.total_minor,quote.terms_version]);
  let raceOrder;
  await check("Security: 12 independent authenticated connections race; exactly one slot commits", async()=>{
    const sessions = await Promise.all(Array.from({length:12},(_,i)=>client("authenticated",uid(i%2+1))));
    const attempts = await Promise.allSettled(sessions.map(c=>hold(c,randomUUID())));
    const accepted = attempts.filter(r=>r.status==="fulfilled");
    assert.equal(accepted.length,1);
    for(const r of attempts.filter(r=>r.status==="rejected")) assert.match(r.reason.message,/slot_unavailable/);
    raceOrder = accepted[0].value;
    assert.equal(await scalar(root,"select count(*)::int from orders where offering_id=$1 and starts_at=$2 and status='PENDING_PAYMENT'",[offering.id,slot.starts_at]),1);
  });
  await check("Security: concurrent same idempotency key returns one order and one expiry",async()=>{
    const c1=await client("authenticated",raceOrder.customer_id),c2=await client("authenticated",raceOrder.customer_id);
    const rows=await Promise.all([hold(c1,raceOrder.idempotency_key),hold(c2,raceOrder.idempotency_key)]);
    assert.ok(rows.every(r=>r.id===raceOrder.id && r.expires_at===raceOrder.expires_at));
  });
  await check("Security: user metadata cannot elevate DB role; customer/provider cannot change own role",async()=>{
    for(const c of [a,p]) {
      await c.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({user_metadata:{role:'admin',is_admin:true}})]);
      await assert.rejects(c.query("select commerce_admin_summary()"),/forbidden/);
      await assert.rejects(c.query("update profiles set role='admin' where id=auth.uid()"),/permission denied|role|forbidden/);
      await c.query("select set_config('request.jwt.claims','{}',false)");
    }
    assert.equal(await scalar(root,"select role from profiles where id=$1",[uid(1)]),'customer');
  });
  await check("Security: anonymous order mutation and unrelated provider transition fail",async()=>{
    await assert.rejects(guest.query("select commerce_transition_order($1,'CANCELLED')",[raceOrder.id]),/permission denied|unauthorized/);
    await assert.rejects(p2.query("select commerce_transition_order($1,'IN_PROGRESS')",[raceOrder.id]),/forbidden/);
    assert.equal(await scalar(root,"select status from orders where id=$1",[raceOrder.id]),'PENDING_PAYMENT');
  });
  await check("Security: payment transaction, order and status audit roll back together on audit failure",async()=>{
    await service.query("select commerce_begin_payment($1)",[raceOrder.id]);
    await service.query("select commerce_attach_payment($1,'TEST-atomic-token','https://sandbox-cpp.iyzipay.com/test')",[raceOrder.id]);
    await root.query("create function public.security_test_audit_failure() returns trigger language plpgsql as $$ begin raise exception 'TEST audit unavailable'; end $$; create trigger security_test_fail before insert on audit_logs for each row execute function public.security_test_audit_failure()");
    const before=(await root.query("select status,payment_status from orders where id=$1",[raceOrder.id])).rows[0];
    try {
      await assert.rejects(service.query("select commerce_resolve_payment($1,'TEST-atomic-token','TEST-atomic-payment',true,null,'TEST-atomic-item')",[raceOrder.id]),/TEST audit unavailable/);
      assert.deepEqual((await root.query("select status,payment_status from orders where id=$1",[raceOrder.id])).rows[0],before);
      assert.equal(await scalar(root,"select status from payment_transactions where order_id=$1",[raceOrder.id]),'AWAITING');
    } finally { await root.query("drop trigger security_test_fail on audit_logs; drop function public.security_test_audit_failure()"); }
  });
  await check("Security: participant cannot finalize unverified settlement",async()=>{
    for(const c of [a,b,p,p2,guest,admin]) await assert.rejects(c.query("select commerce_finish_settlement($1,'refund')",[raceOrder.id]),/permission denied/);
    assert.equal(await scalar(root,"select status from orders where id=$1",[raceOrder.id]),'PENDING_PAYMENT');
  });
}
