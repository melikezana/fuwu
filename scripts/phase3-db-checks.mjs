import assert from "node:assert/strict";
export async function phase3Checks({ root, a, p, p2, admin, service, guest, pid, scalar, check, winner, winningClient }) {
  await check("Financial identity and processor key cannot be read through a public profile", async () => {
    await root.query("update providers set payout_iban='TRTESTONLY',tax_identity_number='TEST-IDENTITY' where id=$1",[pid(1)]);
    for (const c of [guest,a,p,p2,admin]) for(const column of ['payout_iban','tax_identity_number','tax_office','legal_name','payout_address','iyzico_submerchant_key','iyzico_submerchant_conversation_id']) await assert.rejects(c.query(`select ${column} from providers`),/permission denied/);
    await assert.rejects(scalar(a,"select commerce_provider_private($1)",[pid(1)]),/forbidden/);
    await assert.rejects(scalar(p2,"select commerce_provider_private($1)",[pid(1)]),/forbidden/);
    await assert.rejects(scalar(guest,"select commerce_provider_private($1)",[pid(1)]),/permission denied/);
    const own=await scalar(p,"select commerce_provider_private($1)",[pid(1)]);
    assert.deepEqual(Object.keys(own).sort(),['payout_iban','tax_identity_number','tax_office','legal_name','payout_address'].sort());
    assert.equal(own.payout_iban,'TRTESTONLY'); assert.equal(own.tax_identity_number,'TEST-IDENTITY');
    await assert.rejects(p.query("update providers set payout_iban='forged' where id=$1",[pid(1)]),/provider_field_forbidden/);
    assert.ok(!JSON.stringify(own).includes('sandbox-test'));
    assert.equal(await scalar(guest,"select count(id)::int from providers"),await scalar(root,"select count(id)::int from providers"));
    assert.ok(await scalar(admin,"select commerce_provider_private($1)",[pid(1)]));
    assert.equal(await scalar(service,"select iyzico_submerchant_key from providers where id=$1",[pid(1)]),'sandbox-test');
  });
  await check("Phase 3 health is admin-only and evidence cannot be forged by participants", async () => {
    await assert.rejects(scalar(a,"select commerce_admin_health()"), /forbidden/);
    await assert.rejects(scalar(p,"select commerce_admin_health()"), /forbidden/);
    await assert.rejects(scalar(guest,"select commerce_admin_health()"), /permission denied/);
    await assert.rejects(a.query("select commerce_record_health('cron',true,'spoof')"), /permission denied/);
    assert.equal(await scalar(a,"select count(*)::int from operations_health_checks"),0);
    const health = await scalar(admin,"select commerce_admin_health()");
    assert.equal(health.contract_ok,true); assert.deepEqual(health.missing_contracts,[]);
    await service.query("select commerce_record_health('cron',true,'TEST completed cleanup')");
    const before = (await scalar(admin,"select commerce_admin_health()")).probes[0];
    await service.query("select commerce_record_health('cron',false,'TEST unavailable')");
    const after = (await scalar(admin,"select commerce_admin_health()")).probes[0];
    assert.equal(after.passed,false); assert.equal(after.last_success_at,before.last_success_at); assert.ok(after.checked_at);
  });
  await check("Store price and schedule actions leave redacted audit evidence", async () => {
    const rows=(await admin.query("select metadata from audit_logs where action='provider.store_updated'")).rows;
    assert.ok(rows.length>0);for(const row of rows)assert.ok(!/sandbox-test|TRTESTONLY|TEST-IDENTITY|checkout_token|payout_iban/.test(JSON.stringify(row)));
  });
  await check("Moderation does not reopen an already used order review entitlement", async () => {
    await root.query("delete from reviews where order_id=$1",[winner.id]);
    await assert.rejects(winningClient.query("select commerce_submit_review($1,5::smallint,'TEST attempted review after moderation')",[winner.id]),/review-already-submitted/);
    assert.equal(await scalar(a,"select count(*)::int from review_submission_receipts"),0);
    assert.equal(await scalar(root,"select count(*)::int from review_submission_receipts where order_id=$1",[winner.id]),1);
  });
  const climate = await scalar(root,"select id from service_catalog where slug='klima-bakimi'");
  const custom = await scalar(p2,"select commerce_create_variant($1,$2,'TEST 3 klima')",[pid(2),climate]);
  await check("Providers create their own packages; customers and other owners are denied", async () => {
    await assert.rejects(a.query("select commerce_create_variant($1,$2,'TEST forged')",[pid(2),climate]),/forbidden/);
    await assert.rejects(p.query("select commerce_create_variant($1,$2,'TEST forged')",[pid(2),climate]),/forbidden/);
    assert.equal(await scalar(p2,"select commerce_create_variant($1,$2,'TEST 3 klima')",[pid(2),climate]),custom);
    assert.equal(await scalar(root,"select provider_id from service_variants where id=$1",[custom]),pid(2));
    await admin.query("select commerce_admin_save_service($1,(select to_jsonb(c) from service_catalog c where id=$1),'[\"TEST global package\"]')",[climate]);
    assert.equal(await scalar(root,"select is_active from service_variants where id=$1",[custom]),true);
    await root.query("update providers set category_id=(select category_id from service_catalog where id=$1) where id=$2",[climate,pid(1)]);
    const row={service_id:climate,variant_id:custom,price_minor:100000,duration_minutes:60,district_ids:[winner.district_id],is_active:true};
    await assert.rejects(p.query("select commerce_save_store($1,$2,'[]','[]')",[pid(1),JSON.stringify([row])]),/invalid_service_variant/);
    await p2.query("select commerce_save_store($1,$2,'[]','[]')",[pid(2),JSON.stringify([row])]);
    await p2.query("select commerce_save_store($1,'[]','[]','[]')",[pid(2)]);
    assert.equal(await scalar(root,"select count(*)::int from provider_service_offerings where provider_id=$1 and is_active",[pid(2)]),0);
  });
  const make = async (status="IN_PROGRESS", transaction=true) => {
    const id=await scalar(root,"insert into orders(customer_id,provider_id,offering_id,service_name,scope,provider_name,district_id,district_name,address,starts_at,ends_at,total_minor,commission_minor,provider_gross_minor,payment_status,status,expires_at,idempotency_key) select customer_id,provider_id,offering_id,service_name,scope,provider_name,district_id,district_name,address,now()-interval '3 hours',now()-interval '1 hour',total_minor,commission_minor,provider_gross_minor,'PAID',$2,now(),gen_random_uuid() from orders where id=$1 returning id",[winner.id,status]);
    if(transaction) await root.query("insert into payment_transactions(order_id,conversation_id,status) values($1::uuid,$1::text,'SUCCEEDED')",[id]);
    return id;
  };
  await check("Missing or malformed completion code never completes a paid service", async () => {
    const id=await make();
    await root.query("delete from order_completion_codes where order_id=$1",[id]);
    assert.equal((await scalar(p,"select commerce_transition_order($1,'COMPLETED')",[id])).error,"completion_code_unavailable");
    assert.equal(await scalar(root,"select status from orders where id=$1",[id]),"IN_PROGRESS");
    await root.query("insert into order_completion_codes(order_id,code) values($1,'654321')",[id]);
    for(const code of [null,"","12345","000000","999999"]) assert.equal((await scalar(p,"select commerce_transition_order($1,'COMPLETED',$2)",[id,code])).error,"invalid_completion_code");
    assert.equal((await scalar(p,"select commerce_transition_order($1,'COMPLETED','654321')",[id])).error,"code_locked");
    await root.query("update order_completion_codes set locked_until=null where order_id=$1",[id]);
    assert.equal((await scalar(p,"select commerce_transition_order($1,'COMPLETED','654321')",[id])).status,"COMPLETED");
  });
  await check("Unverified payment and unapproved provider cannot advance a service", async () => {
    const noPayment=await make("CONFIRMED",false);
    await assert.rejects(p.query("select commerce_transition_order($1,'PROVIDER_ON_THE_WAY')",[noPayment]),/transition_forbidden/);
    const id=await make("CONFIRMED");
    await root.query("update providers set is_approved=false where id=$1",[pid(1)]);
    await assert.rejects(p.query("select commerce_transition_order($1,'PROVIDER_ON_THE_WAY')",[id]),/transition_forbidden/);
    await assert.rejects(p.query("select commerce_save_store($1,'[]','[]','[]')",[pid(1)]),/forbidden/);
    await root.query("update providers set is_approved=true where id=$1",[pid(1)]);
    await assert.rejects(p2.query("select commerce_transition_order($1,'PROVIDER_ON_THE_WAY')",[id]),/transition_forbidden/);
  });
}
