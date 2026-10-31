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
 assert.equal(after.categories.filter(c=>c.is_active).length,11);
 const fk=(await db.query("select confrelid::regclass::text target from pg_constraint where conrelid='payment_transactions'::regclass and contype='f'")).rows;
 assert.ok(fk.some(r=>r.target==='commerce_orders'));
 await assert.rejects(db.query("insert into payouts(order_id,provider_id,amount) values(gen_random_uuid(),'b1000000-0000-4000-8000-000000000002',1)"),/order bulunamadi/);
 await assert.rejects(db.query("delete from orders where id='b2000000-0000-4000-8000-000000000001'"),/foreign key constraint/);
 checks.push('Observed legacy orders/payment/payout/dispute/webhook graph: relation OIDs, decimal money, original rows, FK targets, audit and 11 active categories preserved; legacy payout trigger still enforces its contract');
}
