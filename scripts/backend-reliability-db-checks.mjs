import assert from "node:assert/strict";

// A verified processor response is simulated explicitly by SQL contract tests.
// This helper never contacts a processor and is not application/runtime code.
export async function finishVerified(service, id, kind) {
  const { rows: [r] } = await service.query("select t.item_transaction_id,o.total_minor from payment_transactions t join orders o on o.id=t.order_id where o.id=$1",[id]);
  await service.query("select commerce_record_settlement_result($1,$2,$3,'VERIFIED',null,null,$4,$3,$5,'TRY')",[id,kind,`${kind}-${id}`,r.item_transaction_id,r.total_minor]);
  await service.query("select commerce_finish_settlement($1,$2)",[id,kind]);
}

export async function reliabilityChecks({root,a,b,p,admin,service,guest,scalar,check,winner}) {
  const clone=async()=>{
    const id=await scalar(root,"insert into orders select (jsonb_populate_record(null::orders,to_jsonb(o)||jsonb_build_object('id',gen_random_uuid(),'idempotency_key',gen_random_uuid(),'status','REFUND_PENDING','payment_status','REFUND_PENDING'))).* from orders o where id=$1 returning id",[winner.id]);
    await service.query("insert into payment_transactions(order_id,conversation_id,status,payment_id,item_transaction_id) values($1::uuid,'order-'||$1::text,'SUCCEEDED','payment-'||$1::text,'item-'||$1::text)",[id]);
    return id;
  };
  const id=await clone(), ref=`refund-${id}`;
  await check("Reliability: legacy checkout token and destination snapshot have no browser SELECT privilege",async()=>{
    for(const client of [a,admin,guest]) for(const column of ['iyzico_checkout_token','iyzico_submerchant_key_snapshot']) await assert.rejects(client.query(`select ${column} from payments`),/permission denied/);
  });
  await check("Reliability: legacy initializer has one concurrent claim, a separate admin-only queue and audit",async()=>{
    const legacyId=await scalar(service,"insert into payments(request_id,status) values(gen_random_uuid(),'pending_confirmation') returning id");
    const attempts=await Promise.all([service,root].map(c=>c.query("update payments set checkout_initialization_state='IN_FLIGHT' where id=$1 and checkout_initialization_state='NONE' returning id",[legacyId])));
    assert.equal(attempts.reduce((n,r)=>n+r.rowCount,0),1);
    const queue=await scalar(admin,"select commerce_admin_legacy_checkout_queue()");
    assert.ok(queue.some(row=>row.payment_id===legacyId));assert.doesNotMatch(JSON.stringify(queue),/checkout_token|submerchant|address/);
    await assert.rejects(a.query("select commerce_admin_legacy_checkout_queue()"),/forbidden/);
    assert.equal(await scalar(root,"select count(*)::int from audit_logs where entity_id=$1 and action='commerce.legacy_checkout_state'",[legacyId]),1);
  });
  await check("Reliability: one settlement claim across concurrent DB sessions; finalization needs verified evidence",async()=>{
    const [x,y]=await Promise.all([scalar(service,"select commerce_claim_settlement($1,'refund')",[id]),scalar(root,"select commerce_claim_settlement($1,'refund')",[id])]);
    assert.equal([x,y].filter(v=>v.claimed).length,1);
    await assert.rejects(service.query("select commerce_finish_settlement($1,'refund')",[id]),/settlement_not_verified/);
    assert.equal(await scalar(root,"select status from orders where id=$1",[id]),"REFUND_PENDING");
  });
  await check("Reliability: wrong item, amount, currency or operation reference cannot finalize a refund",async()=>{
    const amount=await scalar(root,"select total_minor from orders where id=$1",[id]);
    const args=[id,ref,`item-${id}`,ref,amount,'TRY'];
    for(const [index,bad] of [[1,'wrong-ref'],[2,'wrong-item'],[3,'wrong-conversation'],[4,amount-1],[5,'USD']]){
      const altered=[...args];altered[index]=bad;
      await assert.rejects(service.query("select commerce_record_settlement_result($1,'refund',$2,'VERIFIED',null,null,$3,$4,$5,$6)",altered),/settlement_reference_mismatch|settlement_verification_failed/);
    }
  });
  await check("Reliability: timeout is durable, observable and never grants a second external claim",async()=>{
    await service.query("select commerce_record_settlement_result($1,'refund',$2,'MANUAL_REVIEW','processor_timeout')",[id,ref]);
    assert.equal((await scalar(service,"select commerce_claim_settlement($1,'refund')",[id])).claimed,false);
    const queue=await scalar(admin,"select commerce_admin_settlement_queue()");
    assert.equal(queue.find(op=>op.operation_reference===ref).failure_class,"processor_timeout");
    assert.equal(await scalar(root,"select count(*)::int from audit_logs where entity_id=$1 and metadata->>'failure_class'='processor_timeout'",[id]),1);
    assert.doesNotMatch(JSON.stringify(queue),/checkout_token|item_transaction_id|submerchant|address/);
  });
  await check("Reliability: participants cannot forge settlement evidence or access the operational queue",async()=>{
    for(const client of [a,b,p,guest]){
      await assert.rejects(client.query("select commerce_admin_settlement_queue()"),/forbidden|permission denied/);
      await assert.rejects(client.query("select * from commerce_settlement_operations"),/permission denied/);
      await assert.rejects(client.query("select commerce_record_settlement_result($1,'refund',$2,'VERIFIED')",[id,ref]),/permission denied/);
    }
  });
  await check("Reliability: admin review reference never marks a refund paid or complete",async()=>{
    await admin.query("select commerce_review_settlement($1,'IYZ-SUPPORT-TEST-1')",[ref]);
    assert.equal(await scalar(root,"select status from orders where id=$1",[id]),"REFUND_PENDING");
    await assert.rejects(service.query("select commerce_finish_settlement($1,'refund')",[id]),/settlement_not_verified/);
  });
  await check("Reliability: verified result survives local finish failure; duplicate finish is idempotent",async()=>{
    await finishVerified(service,id,'refund');
    const n=await scalar(root,"select count(*)::int from order_status_events where order_id=$1",[id]);
    await service.query("select commerce_finish_settlement($1,'refund')",[id]);
    assert.equal(await scalar(root,"select count(*)::int from order_status_events where order_id=$1",[id]),n);
    assert.equal(await scalar(root,"select refund_state from payment_transactions where order_id=$1",[id]),"REFUNDED");
  });
  await check("Reliability: an offering withdrawn after the hold cannot start payment",async()=>{
    const pending=await scalar(root,"insert into orders select (jsonb_populate_record(null::orders,to_jsonb(o)||jsonb_build_object('id',gen_random_uuid(),'idempotency_key',gen_random_uuid(),'status','PENDING_PAYMENT','payment_status','UNPAID','expires_at',clock_timestamp()+interval '10 minutes'))).* from orders o where id=$1 returning id",[winner.id]);
    const offering=await scalar(root,"select offering_id from orders where id=$1",[pending]);
    const wasActive=await scalar(root,"select is_active from provider_service_offerings where id=$1",[offering]);
    await root.query("update provider_service_offerings set is_active=false where id=$1",[offering]);
    await assert.rejects(service.query("select commerce_begin_payment($1)",[pending]),/offering_unavailable/);
    assert.equal(await scalar(root,"select count(*)::int from payment_transactions where order_id=$1",[pending]),0);
    await root.query("update provider_service_offerings set is_active=$2 where id=$1",[offering,wasActive]);
  });
}
