import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

// Mesafeli Sözleşmeler Yönetmeliği: ön bilgilendirme onayı, taraf bilgileri, erken ifa onayı ve cayma (iptal) hakkı.
// Yalnızca zincir çalıştırıcısının kurduğu, tek kullanımlık yerel PostgreSQL'de çalışır; her şey geri alınır.
const VERSION='mesafeli-hizmet-2026-11-24';
export async function distanceContractChecks(db, checks) {
 const owner=randomUUID(),customer=randomUUID(),pid=randomUUID();
 const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
 const as=async(role,id='')=>{await db.query('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role',$2,false)",[id,role]);await db.query(`set role ${role}`);};
 const fails=async(sql,args,re)=>{await db.query('savepoint dc_expected');try{await assert.rejects(db.query(sql,args),re);}finally{await db.query('rollback to savepoint dc_expected');await db.query('release savepoint dc_expected');}};
 await as('postgres');
 await db.query('begin');
 try{
  await db.query("insert into auth.users(id,email,email_confirmed_at) values($1,'dc-owner@example.invalid',now()),($2,'dc-customer@example.invalid',now())",[owner,customer]);
  const cat=await scalar("insert into service_categories(name,slug) values('TEST Distance Contract','test-dc-'||gen_random_uuid()) returning id");
  const district=await scalar("insert into districts(name,slug) values('TEST DC District','test-dc-'||gen_random_uuid()) returning id");
  await db.query("insert into providers(id,user_id,name,phone,category_id,district_id,description,is_active,is_approved) values($1,$2,'TEST Contract Provider','+905550003333',$3,$4,'TEST factual provider service description.',true,true)",[pid,owner,cat,district]);
  await db.query("insert into provider_publication_reviews(provider_id,status,fingerprint,record_kind) select p.id,'approved',provider_content_fingerprint(p),'real' from providers p where p.id=$1 on conflict(provider_id) do update set status='approved',fingerprint=excluded.fingerprint,record_kind='real'",[pid]);
  const service=await scalar("insert into service_catalog(category_id,slug,name,description,scope,exclusions,image_url,pricing_type) values($1,'test-dc-'||gen_random_uuid(),'TEST Contract Service','TEST description text','TEST scope included','TEST parts excluded','/images/services/cleaning.webp','FIXED_PRICE') returning id",[cat]);
  const offer=await scalar("insert into provider_service_offerings(provider_id,service_id,price_minor,duration_minutes,district_ids,is_active) values($1,$2,100000,60,array[$3]::uuid[],true) returning id",[pid,service,district]);
  for(let d=0;d<7;d++) await db.query("insert into provider_availability(provider_id,weekday,starts_at,ends_at) values($1,$2,'00:00','23:45') on conflict do nothing",[pid,d]);
  await db.query("update app_settings set value='0' where key='customer_fee_rate'");
  await db.query("insert into app_settings(key,value) values('pay_at_door_enabled','true'),('legal_intermediary_tax_id',''),('legal_intermediary_address',''),('legal_intermediary_phone','') on conflict(key) do update set value=excluded.value");

  // Satıcı bilgisi eksik usta satışta görünmez; bilgiler tamamlanınca görünür.
  await as('anon');
  assert.equal((await scalar('select commerce_offers($1,null,null)',[service])).length,0,'provider without seller identity is not on sale');
  await as('postgres');
  await db.query("update providers set legal_name='TEST Ahmet Usta',tax_identity_number='11111111110',tax_office='TEST Kadıköy',payout_address='TEST Caferağa Mah. Örnek Sok. No 1 Kadıköy' where id=$1",[pid]);
  await as('anon');
  assert.equal((await scalar('select commerce_offers($1,null,null)',[service])).length,1);
  await fails('select commerce_checkout_legal($1)',[offer],/permission denied/);
  checks.push('Distance contract: a provider without legal name, tax ID, address and phone is never on sale; anonymous visitors cannot read seller identities');

  // FUWU bilgileri eksikken ön bilgilendirme hazır değil ve sipariş reddedilir.
  const day=async(offset)=>(await db.query("select ((now() at time zone 'Europe/Istanbul')::date+$1::int)::text d",[offset])).rows[0].d;
  const soon=(await db.query('select * from commerce_slots($1,$2,$3)',[offer,await day(1),district])).rows;
  const far=(await db.query('select * from commerce_slots($1,$2,$3)',[offer,await day(20),district])).rows;
  assert.ok(soon.length>3&&far.length>0);
  await as('authenticated',customer);
  const legal=await scalar('select commerce_checkout_legal($1)',[offer]);
  assert.equal(legal.version,VERSION);assert.equal(legal.ready,false);assert.equal(legal.provider.ready,true);assert.equal(legal.intermediary.ready,false);
  assert.equal(legal.provider.tax_id,'11111111110');assert.equal(legal.provider.name,'TEST Ahmet Usta');
  const place=(starts,consent,version=VERSION,k=randomUUID())=>scalar("select commerce_place_order($1,$2,$3,'TEST Moda Mah. Örnek Sok. No 1 D 2',$4,100000,'[]','PAY_AT_DOOR',null,false,'fuwu-fees-v1',$5,$6)",[offer,starts,district,k,version,consent]);
  await fails("select commerce_place_order($1,$2,$3,'TEST Moda Mah. Örnek Sok. No 1 D 2',$4,100000,'[]','PAY_AT_DOOR',null,false,'fuwu-fees-v1',$5,true)",[offer,soon[0].starts_at,district,randomUUID(),VERSION],/legal_identity_incomplete/);
  await as('postgres');
  await db.query("update app_settings set value=v.value from (values('legal_intermediary_tax_id','22222222220'),('legal_intermediary_address','TEST FUWU Adresi Mah. Sok. No 2 İstanbul'),('legal_intermediary_phone','+90 850 000 00 00')) v(key,value) where app_settings.key=v.key");
  await as('authenticated',customer);
  assert.equal((await scalar('select commerce_checkout_legal($1)',[offer])).ready,true);
  checks.push('Distance contract: orders are refused while FUWU (intermediary) identity is incomplete; checkout shows both parties once complete');

  // Sürüm ve erken ifa onayı.
  await fails("select commerce_place_order($1,$2,$3,'TEST Moda Mah. Örnek Sok. No 1 D 2',$4,100000,'[]','PAY_AT_DOOR',null,false,'fuwu-fees-v1','eski-surum',true)",[offer,soon[0].starts_at,district,randomUUID()],/legal_version_changed/);
  await fails("select commerce_place_order($1,$2,$3,'TEST Moda Mah. Örnek Sok. No 1 D 2',$4,100000,'[]','PAY_AT_DOOR',null,false,'fuwu-fees-v1',$5,false)",[offer,soon[1].starts_at,district,randomUUID(),VERSION],/early_start_consent_required/);
  const order=await place(soon[2].starts_at,true);
  assert.equal(order.legal_version,VERSION);assert.ok(order.legal_accepted_at);assert.ok(order.early_start_consent_at);
  assert.equal(order.legal_parties.provider.tax_id,'11111111110');assert.equal(order.legal_parties.intermediary.tax_id,'22222222220');
  assert.equal(order.legal_parties.exclusions,'TEST parts excluded');assert.equal(order.legal_parties.within_withdrawal_period,true);
  assert.equal('ready' in order.legal_parties.provider,false);
  const later=await place(far[0].starts_at,false);
  assert.equal(later.early_start_consent_at,null);assert.equal(later.legal_parties.within_withdrawal_period,false);
  checks.push('Distance contract: the accepted text version, time, early-performance consent and both parties\' identities are stored on the order; appointments after the 14-day period need no early consent');

  // Kayıt değiştirilemez; sonradan değişen usta bilgisi eski siparişi etkilemez.
  await as('postgres');
  await fails("update commerce_orders set legal_parties='{}' where id=$1",[order.id],/immutable_legal_record/);
  await fails("update commerce_orders set legal_version='x' where id=$1",[order.id],/immutable_legal_record/);
  await db.query("update providers set payout_address='TEST Yeni Adres Mah. Sok. No 9' where id=$1",[pid]);
  assert.equal(await scalar("select legal_parties->'provider'->>'address' from commerce_orders where id=$1",[order.id]),'TEST Caferağa Mah. Örnek Sok. No 1 Kadıköy');
  checks.push('Distance contract: the legal record on an order is immutable and keeps the identities shown at acceptance');

  // Cayma: usta yoldayken de müşteri ücretsiz iptal eder; hizmete başlandıktan sonra edemez.
  await as('authenticated',owner);await scalar("select commerce_transition_order($1,'PROVIDER_ON_THE_WAY')",[order.id]);
  await as('authenticated',customer);
  assert.equal((await scalar("select commerce_transition_order($1,'CANCELLED')",[order.id])).status,'CANCELLED');
  const started=await place(soon[3].starts_at,true);
  await as('postgres');await db.query("update commerce_orders set status='IN_PROGRESS' where id=$1",[started.id]);
  await as('authenticated',customer);
  await fails("select commerce_transition_order($1,'CANCELLED')",[started.id],/transition_forbidden/);
  checks.push('Distance contract: the customer can withdraw free of charge until the service starts (even while the usta is on the way), not after');
 } finally {
  await db.query('reset role');
  await db.query('rollback');
 }
}
