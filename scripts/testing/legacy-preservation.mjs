import assert from 'node:assert/strict';

const tables=['orders','order_payments','payouts','disputes','webhook_events','app_settings','request_reassignment_log'];
export async function legacySnapshot(db) {
 const result={};
 for(const name of tables) result[name]={
  oid:(await db.query('select to_regclass($1)::oid id',['public.'+name])).rows[0].id,
  rows:(await db.query(`select to_jsonb(t) row from public.${name} t order by to_jsonb(t)::text`)).rows.map(r=>r.row),
 };
 result.constraints=(await db.query("select c.relname,k.conname,pg_get_constraintdef(k.oid) definition,k.confrelid::oid target from pg_constraint k join pg_class c on c.oid=k.conrelid where c.oid=any($1::regclass[]) order by c.relname,k.conname",[tables.filter(t=>t!=='request_reassignment_log').map(t=>'public.'+t)])).rows;
 result.audit=(await db.query("select to_jsonb(a) row from audit_logs a where id='b2000000-0000-4000-8000-000000000007'")).rows;
 result.indexes=(await db.query("select tablename,indexname,indexdef from pg_indexes where schemaname='public' and tablename=any($1::text[]) order by tablename,indexname",[['orders','order_payments','payouts','disputes','webhook_events']])).rows;
 result.categories=(await db.query('select id,slug,is_active from service_categories order by id')).rows;
 result.providerOnboarding=(await db.query('select id,iyzico_submerchant_status from providers order by id')).rows;
 result.onboardingDefault=(await db.query("select pg_get_expr(d.adbin,d.adrelid) value from pg_attrdef d join pg_attribute a on a.attrelid=d.adrelid and a.attnum=d.adnum where d.adrelid='providers'::regclass and a.attname='iyzico_submerchant_status'")).rows;
 return result;
}
export async function verifyLegacyPreservation(db,before,checks) {
 const after=await legacySnapshot(db);
 for(const name of tables) {
  assert.equal(after[name].oid,before[name].oid,name+' relation OID unchanged');
  for(const row of before[name].rows) assert.ok(after[name].rows.some(r=>JSON.stringify(r)===JSON.stringify(row)),name+' historical values unchanged');
 }
 assert.deepEqual(after.constraints,before.constraints,'Legacy money/status constraints and incoming FK targets unchanged');
 assert.deepEqual(after.indexes,before.indexes,'Legacy financial indexes and partial unique constraints unchanged');
 assert.deepEqual(after.audit,before.audit,'Original audit remains byte-for-byte');
 assert.deepEqual(after.categories,before.categories,'All observed category decisions preserved');
 assert.deepEqual(after.providerOnboarding,before.providerOnboarding,'Legacy none/pending onboarding values preserved without activation');
 assert.deepEqual(after.onboardingDefault,before.onboardingDefault,'Legacy onboarding default preserved');
 assert.ok(before.providerOnboarding.some(p=>p.iyzico_submerchant_status==='none'));
 assert.ok(before.providerOnboarding.some(p=>p.iyzico_submerchant_status==='pending'));
 assert.equal(after.categories.filter(c=>c.is_active).length,11);
 const fk=(await db.query("select confrelid::regclass::text target from pg_constraint where conrelid='payment_transactions'::regclass and contype='f'")).rows;
 assert.ok(fk.some(r=>r.target==='commerce_orders'));
 await assert.rejects(db.query("insert into payouts(order_id,provider_id,amount) values(gen_random_uuid(),'b1000000-0000-4000-8000-000000000002',1)"),/order bulunamadi/);
 await assert.rejects(db.query("delete from orders where id='b2000000-0000-4000-8000-000000000001'"),/foreign key constraint/);
 checks.push('Observed legacy orders/payment/payout/dispute/webhook graph: relation OIDs, decimal money, original rows, FK targets, audit and 11 active categories preserved; legacy payout trigger still enforces its contract');
 await verifyLegacyFinancialPrivacy(db,checks);
}

async function verifyLegacyFinancialPrivacy(db,checks) {
 const customer='b1000000-0000-4000-8000-000000000001';
 const owner=(await db.query("select user_id from providers where id='b1000000-0000-4000-8000-000000000002'")).rows[0].user_id;
 const other='b3000000-0000-4000-8000-000000000001',admin='b3000000-0000-4000-8000-000000000002';
 await db.query("insert into auth.users(id,email) values($1,'TEST-financial-other@example.invalid'),($2,'TEST-financial-admin@example.invalid')",[other,admin]);
 await db.query("update profiles set role='admin' where id=$1",[admin]);
 const denied=[
  ['order_payments',['iyzico_token','iyzico_payment_id','iyzico_conversation_id','iyzico_payment_transaction_id','refund_id','raw_response','error_code','error_message']],
  ['payouts',['iyzico_transfer_id','raw_response','failure_reason']],
 ];
 try {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[customer]);
  await db.query('set role authenticated');
  assert.equal((await db.query('select paid_price,status from order_payments')).rows[0]?.paid_price,'1234.56');
  for(const [table,columns] of denied) for(const column of columns) {
   await assert.rejects(db.query(`select ${column} from ${table}`),/permission denied/);
  }
  await assert.rejects(db.query('select * from order_payments'),/permission denied/);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
  assert.equal((await db.query('select amount,status from payouts')).rows[0]?.amount,'1111.10');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);
  assert.equal((await db.query('select id from order_payments')).rowCount,0);
  assert.equal((await db.query('select id from payouts')).rowCount,0);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[admin]);
  assert.equal((await db.query('select paid_price from order_payments')).rowCount,1);
  assert.equal((await db.query('select amount from payouts')).rowCount,1);
  await assert.rejects(db.query('select iyzico_token,raw_response from order_payments'),/permission denied/);
  await assert.rejects(db.query('select raw_response from payouts'),/permission denied/);
  await db.query('reset role');
  await db.query('set role anon');
  await assert.rejects(db.query('select id from order_payments'),/permission denied/);
  await assert.rejects(db.query('select id from payouts'),/permission denied/);
  checks.push('Legacy financial ACL: customer/provider summaries persist under RLS; all processor/token/raw/error columns, SELECT * and anonymous reads denied, including independent column grants');
  await db.query('reset role');
  await db.query('set role service_role');
  const payment=(await db.query('select iyzico_token,raw_response from order_payments')).rows[0];
  assert.equal(payment.iyzico_token,'TEST-synthetic-legacy-token');
  assert.deepEqual(payment.raw_response,{synthetic:true});
  assert.ok((await db.query('select raw_response from payouts')).rowCount>0);
  checks.push('Legacy financial ACL: server service role retains original processor evidence; no row, FK or historical value rewritten');
 } finally {
  await db.query('reset role');
  await db.query("select set_config('request.jwt.claim.sub','',false)");
 }
}
