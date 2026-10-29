import fs from "node:fs/promises";
import assert from "node:assert/strict";
export async function publicationChecks({ root, a, p, admin, guest, pid, scalar, check }) {
  const snapshot = async () => {
    const result = {};
    for (const table of ["providers", "orders", "reviews", "payment_transactions", "payments"]) result[table] = (await root.query(`select to_jsonb(t) row from public.${table} t order by id`)).rows;
    return result;
  };
  const before = await snapshot();
  await root.query(await fs.readFile("supabase/migrations/20261029000300_provider_publication_quality.sql", "utf8"));
  await check("P1 publication upgrade preserves every provider, review, order and payment byte-for-byte", async () => { assert.deepEqual(await snapshot(), before); assert.equal(await scalar(root, "select count(*)::int from provider_publication_reviews where status='pending_review'"), before.providers.length); });
  await check("P1 unpublished profiles cannot leak through directory, offers, slots or internal RPC bypass", async () => {
    assert.equal(await scalar(guest, "select count(id)::int from providers"), 0);
    assert.deepEqual(await scalar(guest, "select commerce_offers()"), []);
    await assert.rejects(guest.query("select commerce_offers_before_publication(null,null,null)"), /permission denied/);
    await assert.rejects(guest.query("select * from commerce_slots_before_publication(gen_random_uuid(),current_date,gen_random_uuid())"), /permission denied/);
    const orderId = await scalar(root, "select id from orders where provider_id=$1 limit 1", [pid(1)]);
    await assert.rejects(root.query("insert into payment_transactions(order_id,conversation_id) values($1,'TEST unpublished initializer')", [orderId]), /offering_unavailable/);
    await assert.rejects(a.query("select admin_provider_quality_queue()"), /forbidden/);
    await assert.rejects(a.query("select * from provider_publication_reviews"), /permission denied/);
    await assert.rejects(a.query("select review_provider_publication($1,'x','approved','TEST unauthorized note',null)", [pid(1)]), /forbidden/);
  });
  const description = "TEST · Sadece fixture: musluk montajı, tesisat bakımı ve arıza tespiti.";
  await root.query("update providers set description=$2,is_active=true,is_approved=true,is_verified=true,identity_verified=true where id=$1", [pid(1), description]);
  const fp = await scalar(root, "select fingerprint from provider_publication_reviews where provider_id=$1", [pid(1)]);
  const evidenceId = await scalar(root, "insert into provider_applications(user_id,status,verification_document_path) select user_id,'approved','TEST/private/verification.pdf' from providers where id=$1 returning id", [pid(1)]);
  const review = (fingerprint = fp, status = "approved", evidence = evidenceId) => admin.query("select review_provider_publication($1,$2,$3,'TEST manual content inspection',$4)", [pid(1), fingerprint, status, evidence]);
  await check("P1 admin approval checks current content and requires evidence for verification flags", async () => {
    await assert.rejects(review("00000000000000000000000000000000"), /profile_changed/);
    await assert.rejects(review(fp, "approved", null), /verification_evidence_required/);
    await assert.rejects(review(fp, "approved", "invented-reference"), /verification_evidence_required/);
    await root.query("update provider_applications set status='pending' where id=$1", [evidenceId]);
    await assert.rejects(review(), /verification_evidence_required/);
    await root.query("update provider_applications set status='approved' where id=$1", [evidenceId]);
    await review();
    assert.equal(await scalar(guest, "select provider_is_published($1)", [pid(1)]), true);
    assert.equal(await scalar(root, "select description from providers where id=$1", [pid(1)]), description);
    const gate = await scalar(guest, "select provider_publication_gate()");
    assert.equal(gate.find(r => r.id === pid(1)).verified, true);
    assert.equal(gate.find(r => r.id === pid(1)).review_count, await scalar(root, "select count(*)::int from reviews where provider_id=$1", [pid(1)]));
  });
  await check("P1 valid slots require publication and stored fake ratings cannot become public ratings", async () => {
    const serviceId = await scalar(root, "select id from service_catalog where slug='musluk-montaji'");
    await root.query("update service_catalog set is_active=true where id=$1", [serviceId]);
    await root.query("update service_categories set is_active=true,is_visible=true where id=(select category_id from service_catalog where id=$1)", [serviceId]);
    await root.query("update providers set availability='müsait',iyzico_submerchant_status='active',iyzico_submerchant_key='TEST sandbox merchant',rating=5,review_count=999 where id=$1", [pid(1)]);
    const hours = JSON.stringify(Array.from({length:7}, (_,weekday)=>({weekday,starts_at:'09:00',ends_at:'18:00'})));
    const offering = [{service_id:serviceId,variant_id:null,price_minor:85000,duration_minutes:60,district_ids:['20000000-0000-4000-8000-000000000001'],is_active:true}];
    await p.query("select commerce_save_store($1,$2,$3,'[]'::jsonb)",[pid(1),JSON.stringify(offering),hours]);
    const fid = await scalar(root,"select id from provider_service_offerings where provider_id=$1 and service_id=$2 and is_active",[pid(1),serviceId]);
    const countSlots = () => scalar(guest,"select count(*)::int from commerce_slots($1,(now() at time zone 'Europe/Istanbul')::date+25,'20000000-0000-4000-8000-000000000001')",[fid]);
    assert.ok(await countSlots()>0);
    await review(fp,'hidden'); assert.equal(await countSlots(),0);
    await review(); assert.ok(await countSlots()>0);
    let gate = (await scalar(guest,"select provider_publication_gate()")).find(r=>r.id===pid(1));
    assert.notEqual(gate.review_count,999);
    await root.query("update provider_applications set status='rejected' where id=$1",[evidenceId]);
    gate = (await scalar(guest,"select provider_publication_gate()")).find(r=>r.id===pid(1));
    assert.equal(gate.verified,false);assert.equal(gate.identity_verified,false);
    await root.query("update provider_applications set status='approved' where id=$1",[evidenceId]);
  });
  await check("P1 content edits atomically requeue and remove stale publication without deleting orders", async () => {
    await p.query("update providers set description=$2 where id=$1", [pid(1), description + " Yeni açıklama."]);
    assert.equal(await scalar(guest, "select provider_is_published($1)", [pid(1)]), false);
    assert.equal(await scalar(root, "select status from provider_publication_reviews where provider_id=$1", [pid(1)]), "pending_review");
    await assert.rejects(review(), /profile_changed/);
    assert.deepEqual((await snapshot()).orders, before.orders);
    assert.ok(await scalar(root, "select count(*)::int from audit_logs where action='provider.quality_queued' and entity_id=$1", [pid(1)]));
  });
  await check("P1 audit outage rolls publication approval back atomically", async () => {
    await root.query("create function public.qa_fail_publication_audit() returns trigger language plpgsql as $$ begin if new.action='provider.publication_reviewed' then raise exception 'TEST audit unavailable'; end if; return new; end $$; create trigger qa_fail_publication_audit before insert on audit_logs for each row execute function qa_fail_publication_audit()");
    const current = await scalar(root, "select fingerprint from provider_publication_reviews where provider_id=$1", [pid(1)]);
    await assert.rejects(review(current), /audit unavailable/);
    assert.equal(await scalar(root, "select status from provider_publication_reviews where provider_id=$1", [pid(1)]), "pending_review");
    await root.query("drop trigger qa_fail_publication_audit on audit_logs; drop function qa_fail_publication_audit()");
    await review(current);
    await review(current, "hidden");
    assert.equal(await scalar(guest, "select provider_is_published($1)", [pid(1)]), false);
  });
}
