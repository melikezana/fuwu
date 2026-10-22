import assert from "node:assert/strict";

// Uses only the disposable PostgreSQL cluster created by test-direct-commerce-db.mjs.
export async function reviewQualityChecks({ root, guest, a, b, p, p2, admin, service, winningClient, losingClient, winner, pid, uid, scalar, check, client }) {
  const owner = await scalar(root, "select customer_id from orders where id=$1", [winner.id]);
  async function copyOrder(status = "COMPLETED", customer = owner) {
    return scalar(root, `insert into orders(customer_id,provider_id,offering_id,service_name,variant_name,scope,provider_name,district_id,district_name,address,starts_at,ends_at,total_minor,commission_minor,provider_gross_minor,payment_status,status,expires_at,idempotency_key)
      select $2,provider_id,offering_id,service_name,variant_name,scope,provider_name,district_id,district_name,address,starts_at,ends_at,total_minor,commission_minor,provider_gross_minor,'PAID',$3,expires_at,gen_random_uuid() from orders where id=$1 returning id`, [winner.id, customer, status]);
  }
  const sources = (c, provider = pid(1)) => scalar(c, "select review_eligible_sources($1)", [provider]);
  const review = (c, id, rating = 4) => scalar(c, "select commerce_submit_review($1,$2::smallint,'TEST tamamlanan hizmet değerlendirmesi')", [id, rating]);

  await check("Provider cannot forge rating counts, approval or marketplace payout credentials", async () => {
    for (const assignment of ["rating=1", "review_count=999", "is_approved=false", "iyzico_submerchant_key='spoof'", "iyzico_submerchant_status='unverified'"]) {
      await assert.rejects(p.query(`update providers set ${assignment} where id=$1`, [pid(1)]), /provider_field_forbidden/);
    }
  });

  await check("Review eligibility: guest has no private RPC access", async () => {
    await assert.rejects(sources(guest), /permission denied/);
    await assert.rejects(review(guest, winner.id), /permission denied/);
  });
  await check("Review eligibility: customer without service has no action or write permission", async () => {
    assert.deepEqual(await sources(losingClient), []);
    await assert.rejects(review(losingClient, winner.id), /review-not-eligible/);
    await assert.rejects(a.query("insert into reviews(provider_id,user_id,rating,comment) values($1,$2,5,'TEST bypass attempt')", [pid(1), uid(1)]), /permission denied/);
    await assert.rejects(a.query("update reviews set rating=1"), /permission denied/);
  });
  const request = await scalar(root, "insert into service_requests(assigned_provider_id,user_id,status) values($1,$2,'completed') returning id", [pid(2), uid(1)]);
  await check("Review eligibility: completed legacy service has a specific source and one review", async () => {
    assert.ok((await sources(a, pid(2))).some(s => s.kind === "request" && s.id === request));
    await a.query("select submit_service_review($1,null,$2,4::smallint,'TEST önceki hizmet değerlendirmesi')", [pid(2), request]);
    assert.equal(await scalar(root, "select service_request_id from reviews where service_request_id=$1", [request]), request);
    await assert.rejects(a.query("select submit_service_review($1,null,$2,4::smallint,'TEST tekrar değerlendirme')", [pid(2), request]), /review-already-submitted/);
  });
  const second = await copyOrder();
  await check("Review eligibility: second paid completed order allows another review of same provider", async () => {
    assert.ok((await sources(winningClient)).some(s => s.id === second && s.kind === "order"));
    await review(winningClient, second, 3);
    assert.equal(await scalar(root, "select count(*)::int from reviews where provider_id=$1 and user_id=$2", [pid(1), owner]), 2);
    assert.equal(Number(await scalar(root, "select rating from providers where id=$1", [pid(1)])), 4);
  });
  await check("Review eligibility: duplicate order and foreign customer order are rejected", async () => {
    await assert.rejects(review(winningClient, second), /review-already-submitted/);
    await assert.rejects(review(losingClient, second), /review-not-eligible/);
    assert.ok(!(await sources(losingClient)).some(s => s.id === second));
  });
  const incomplete = await copyOrder("IN_PROGRESS");
  await check("Review eligibility: unfinished and unpaid services never qualify", async () => {
    await assert.rejects(review(winningClient, incomplete), /review-not-eligible/);
    const unpaid = await copyOrder();
    await root.query("update orders set payment_status='UNPAID' where id=$1", [unpaid]);
    await assert.rejects(review(winningClient, unpaid), /review-not-eligible/);
    assert.ok(!(await sources(winningClient)).some(s => s.id === incomplete || s.id === unpaid));
  });
  const selfOrder = await copyOrder("COMPLETED", uid(3));
  await check("Review eligibility: provider cannot review own order or legacy service", async () => {
    assert.deepEqual(await sources(p), []);
    await assert.rejects(review(p, selfOrder), /review-not-eligible/);
    const ownRequest = await scalar(root, "insert into service_requests(assigned_provider_id,user_id,status) values($1,$2,'completed') returning id", [pid(2), uid(4)]);
    assert.deepEqual(await sources(p2, pid(2)), []);
    await assert.rejects(p2.query("select submit_service_review($1,null,$2,4::smallint,'TEST self review forbidden')", [pid(2), ownRequest]), /review-not-eligible/);
  });
  const concurrent = await copyOrder();
  await check("Two independent review submissions create exactly one row and exact aggregates", async () => {
    const otherSession = await client("authenticated", owner);
    const outcomes = await Promise.allSettled([review(winningClient, concurrent), review(otherSession, concurrent)]);
    assert.equal(outcomes.filter(r => r.status === "fulfilled").length, 1);
    assert.equal(outcomes.filter(r => r.status === "rejected").length, 1);
    assert.equal(await scalar(root, "select count(*)::int from reviews where order_id=$1", [concurrent]), 1);
    const row = (await root.query("select rating,review_count,(select round(avg(rating),1) from reviews where provider_id=$1) actual,(select count(*)::int from reviews where provider_id=$1) n from providers where id=$1", [pid(1)])).rows[0];
    assert.equal(Number(row.rating), Number(row.actual)); assert.equal(row.review_count, row.n);
  });
  await check("Historical source-less review survives and cannot be duplicated by guessing a source", async () => {
    const old = await scalar(root, "insert into reviews(provider_id,user_id,rating,comment,created_at) values($1,$2,2,'TEST historical preserved',now()-interval '1 day') returning id", [pid(3), uid(2)]);
    const oldRequest = await scalar(root, "insert into service_requests(assigned_provider_id,user_id,status,updated_at) values($1,$2,'completed',now()-interval '2 days') returning id", [pid(3), uid(2)]);
    assert.deepEqual(await sources(b, pid(3)), []);
    await assert.rejects(b.query("select submit_service_review($1,null,$2,4::smallint,'TEST guessed historical source')", [pid(3), oldRequest]), /review-not-eligible/);
    assert.equal(await scalar(root, "select comment from reviews where id=$1", [old]), "TEST historical preserved");
    const newRequest = await scalar(root, "insert into service_requests(assigned_provider_id,user_id,status) values($1,$2,'completed') returning id", [pid(3), uid(2)]);
    // Legacy updated_at is not a reliable completion timestamp. Do not guess coverage.
    assert.ok(!(await sources(b, pid(3))).some(s => s.id === newRequest));
  });
  await check("New commerce service after a historical source-less review can still be reviewed", async () => {
    await root.query("insert into reviews(provider_id,user_id,rating,comment,created_at) values($1,$2,4,'TEST old source-less service',now()-interval '1 day')", [pid(1), owner]);
    const fresh = await copyOrder();
    assert.ok((await sources(winningClient)).some(s => s.kind === "order" && s.id === fresh));
    await review(winningClient, fresh);
    assert.equal(await scalar(root, "select count(*)::int from reviews where order_id=$1", [fresh]), 1);
  });
  await check("Public review cards reveal no customer, order, request or private source ids", async () => {
    const rows = await scalar(guest, "select public_provider_reviews($1)", [pid(1)]);
    assert.ok(rows.length >= 3);
    for (const row of rows) assert.deepEqual(Object.keys(row).sort(), ["id", "provider_id", "rating", "comment", "created_at"].sort());
    assert.equal(await scalar(guest, "select count(*)::int from reviews"), 0);
    assert.ok((await losingClient.query("select * from reviews where order_id=$1", [winner.id])).rows.length === 0);
  });
  await check("Moderation deletion refreshes rating/count, including the last review", async () => {
    await root.query("delete from reviews where service_request_id=$1", [request]);
    assert.equal(await scalar(root, "select review_count from providers where id=$1", [pid(2)]), 0);
    assert.equal(Number(await scalar(root, "select rating from providers where id=$1", [pid(2)])), 0);
  });
  await check("Profile schedule and slots share real hours; operational counts keep overdue work", async () => {
    const schedule = await scalar(guest, "select commerce_public_schedule($1)", [pid(1)]);
    assert.equal(schedule.length, 7); assert.ok(schedule.every(h => h.starts_at === "09:00:00"));
    await root.query("update orders set starts_at=now()-interval '3 hours',ends_at=now()-interval '1 hour' where id=$1", [incomplete]);
    const stats = await scalar(p, "select commerce_provider_operations($1)", [pid(1)]);
    assert.ok(stats.active_count >= 1 && stats.overdue_count >= 1);
    await assert.rejects(scalar(p2, "select commerce_provider_operations($1)", [pid(1)]), /forbidden/);
    const metrics = await scalar(admin, "select commerce_admin_summary()");
    assert.ok(metrics.overdue_count >= 1); assert.ok(metrics.paid_count >= 1);
  });
  await check("Paid payment without processor item transaction remains unconfirmed", async () => {
    // Guard tested on a real existing session whose successful transition has not occurred.
    const order = await copyOrder("PENDING_PAYMENT");
    await root.query("update orders set payment_status='UNPAID',expires_at=now()+interval '10 minutes' where id=$1", [order]);
    await service.query("select commerce_begin_payment($1)", [order]);
    await service.query("select commerce_attach_payment($1,'item-guard-token','https://sandbox-cpp.iyzipay.com/test')", [order]);
    await assert.rejects(service.query("select commerce_resolve_payment($1,'item-guard-token','test-missing-item',true)", [order]), /payment_item_missing/);
    assert.equal(await scalar(root, "select payment_status from orders where id=$1", [order]), "UNPAID");
  });
  await check("Uncertain checkout keeps a single initializer and is discoverable in the admin queue", async () => {
    const order = await copyOrder("PENDING_PAYMENT");
    await root.query("update orders set payment_status='UNPAID',expires_at=now()+interval '10 minutes' where id=$1", [order]);
    assert.equal((await scalar(service, "select commerce_begin_payment($1)", [order])).claimed, true);
    await root.query("update payment_transactions set created_at=now()-interval '6 minutes' where order_id=$1", [order]);
    const retry = await scalar(service, "select commerce_begin_payment($1)", [order]);
    assert.equal(retry.claimed, false); assert.equal(retry.status, "INITIALIZING");
    const queue = await scalar(admin, "select commerce_admin_reconciliation(1)");
    assert.ok(queue.orders.some(o => o.id === order));
    assert.equal(queue.count, (await scalar(admin, "select commerce_admin_summary()")).reconciliation_count);
    assert.ok(!JSON.stringify(queue).match(/checkout_token|payment_page_url|item_transaction_id|completion_code/));
    await assert.rejects(scalar(a, "select commerce_admin_reconciliation(1)"), /forbidden/);
    await assert.rejects(scalar(guest, "select commerce_admin_reconciliation(1)"), /permission denied/);
  });
  await check("Verified reconciliation can repair old missing item identity, but cannot change payment identity", async () => {
    await root.query("update payment_transactions set item_transaction_id=null where order_id=$1", [winner.id]);
    await assert.rejects(service.query("select commerce_resolve_payment($1,'token-success','wrong-payment',true,null,'test-item-1')", [winner.id]), /payment_identity_mismatch/);
    await service.query("select commerce_resolve_payment($1,'token-success','test-payment-1',true,null,'test-item-1')", [winner.id]);
    assert.equal(await scalar(root, "select item_transaction_id from payment_transactions where order_id=$1", [winner.id]), "test-item-1");
  });
  await check("Cancellation KPI includes paid cancelled service refunds without counting completed-service refunds", async () => {
    const before = (await scalar(admin, "select commerce_admin_summary()")).cancelled_count;
    const cancelled = await copyOrder("CONFIRMED");
    await root.query("update orders set status='REFUND_PENDING',payment_status='REFUND_PENDING' where id=$1", [cancelled]);
    assert.equal((await scalar(admin, "select commerce_admin_summary()")).cancelled_count, before + 1);
    const completed = await copyOrder();
    await root.query("update orders set status='REFUNDED',payment_status='REFUNDED' where id=$1", [completed]);
    assert.equal((await scalar(admin, "select commerce_admin_summary()")).cancelled_count, before + 1);
  });
}
