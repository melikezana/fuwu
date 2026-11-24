import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

// Doğrudan satın alma: ekstralar, kapıda ödeme, kartlı ödemeyle ayrım ve mutabakat.
// Yalnızca zincir çalıştırıcısının kurduğu, tek kullanımlık yerel PostgreSQL'de çalışır.
export async function directPurchaseChecks(db, checks) {
 const admin=randomUUID(),owner=randomUUID(),customer=randomUUID(),other=randomUUID(),pid=randomUUID();
 const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
 const row=async(sql,args=[])=>(await db.query(sql,args)).rows[0];
 const as=async(role,id='')=>{await db.query('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role',$2,false)",[id,role]);await db.query(`set role ${role}`);};
 const fails=async(sql,args,re)=>{await db.query('savepoint dp_expected');try{await assert.rejects(db.query(sql,args),re);}finally{await db.query('rollback to savepoint dp_expected');await db.query('release savepoint dp_expected');}};
 await as('postgres');
 await db.query('begin');
 try{
  await db.query("insert into auth.users(id,email,email_confirmed_at) values($1,'dp-admin@example.invalid',now()),($2,'dp-owner@example.invalid',now()),($3,'dp-customer@example.invalid',now()),($4,'dp-other@example.invalid',now())",[admin,owner,customer,other]);
  await db.query("update profiles set role='admin' where id=$1",[admin]);
  const cat=await scalar("insert into service_categories(name,slug) values('TEST Direct Purchase','test-dp-'||gen_random_uuid()) returning id");
  const district=await scalar("insert into districts(name,slug) values('TEST DP District','test-dp-'||gen_random_uuid()) returning id");
  // iyzico alt üye hesabı OLMAYAN usta: kapıda ödemeyle satış yapabilmeli, kartla yapamamalı.
  await db.query("insert into providers(id,user_id,name,phone,category_id,district_id,description,is_active,is_approved) values($1,$2,'TEST Door Provider','+905550002222',$3,$4,'TEST factual provider service description.',true,true)",[pid,owner,cat,district]);
  await db.query("insert into provider_publication_reviews(provider_id,status,fingerprint,record_kind) select p.id,'approved',provider_content_fingerprint(p),'real' from providers p where p.id=$1 on conflict(provider_id) do update set status='approved',fingerprint=excluded.fingerprint,record_kind='real'",[pid]);
  assert.equal(await scalar('select provider_is_published($1)',[pid]),true);
  // Ön bilgilendirme için satıcı (usta) ve aracı hizmet sağlayıcı (FUWU) bilgileri tam olmalı.
  await db.query("update providers set legal_name='TEST Usta Ad Soyad',tax_identity_number='11111111110',payout_address='TEST Caferağa Mah. Örnek Sok. No 1 Kadıköy' where id=$1",[pid]);
  await db.query("insert into app_settings(key,value) values('legal_intermediary_tax_id','22222222220'),('legal_intermediary_address','TEST FUWU Adresi Mah. Sok. No 2 İstanbul'),('legal_intermediary_phone','+90 850 000 00 00') on conflict(key) do update set value=excluded.value");
  const service=await scalar("insert into service_catalog(category_id,slug,name,description,scope,image_url,pricing_type) values($1,'test-dp-'||gen_random_uuid(),'TEST Door Service','TEST description text','TEST scope included','/images/services/cleaning.webp','FIXED_PRICE') returning id",[cat]);
  const offer=await scalar("insert into provider_service_offerings(provider_id,service_id,price_minor,duration_minutes,district_ids,is_active) values($1,$2,100000,60,array[$3]::uuid[],true) returning id",[pid,service,district]);
  for(let d=0;d<7;d++) await db.query("insert into provider_availability(provider_id,weekday,starts_at,ends_at) values($1,$2,'00:00','23:45') on conflict do nothing",[pid,d]);
  const oven=await scalar("insert into service_addons(service_id,slug,name,price_minor,max_quantity) values($1,'firin','TEST Fırın içi',35000,1) returning id",[service]);
  const window=await scalar("insert into service_addons(service_id,slug,name,price_minor,max_quantity) values($1,'cam','TEST Cam',15000,4) returning id",[service]);
  const hidden=await scalar("insert into service_addons(service_id,slug,name,price_minor,is_active) values($1,'gizli','TEST Pasif',99900,false) returning id",[service]);
  const otherService=await scalar("insert into service_catalog(category_id,slug,name,description,scope,image_url,pricing_type) values($1,'test-dp-other-'||gen_random_uuid(),'TEST Other','TEST description text','TEST scope included','/images/services/cleaning.webp','FIXED_PRICE') returning id",[cat]);
  const foreign=await scalar("insert into service_addons(service_id,slug,name,price_minor) values($1,'yabanci','TEST Başka hizmet',10000) returning id",[otherService]);
  await db.query("update app_settings set value='0' where key in ('customer_fee_rate')");
  // Kapıda ödeme varsayılan olarak kapalıdır (20261124000300); bu kontroller açıkken davranışı sınar.
  assert.equal(await scalar("select value from app_settings where key='pay_at_door_enabled'"),'false','pay at door is off by default');
  await db.query("update app_settings set value='true' where key='pay_at_door_enabled'");

  // Teklif artık iyzico olmadan görünür; kartla ödeme işareti kapalıdır.
  await as('anon');
  const offers=await scalar('select commerce_offers($1,null,null)',[service]);
  assert.equal(offers.length,1);assert.equal(offers[0].card_payment,false);
  const day=(await row("select ((now() at time zone 'Europe/Istanbul')::date+1)::text d")).d;
  const slots=(await db.query('select * from commerce_slots($1,$2,$3)',[offer,day,district])).rows;
  assert.ok(slots.length>0,'slots without iyzico submerchant');
  checks.push('Direct purchase: published provider without iyzico sub-merchant is listed (card_payment=false) and exposes real slots');

  // Sepet fiyatı sunucuda hesaplanır; pasif, başka hizmete ait, tekrar eden ya da sınır üstü ekstra reddedilir.
  const quote=await scalar('select commerce_quote_basket($1,$2)',[offer,JSON.stringify([{id:window,quantity:2},{id:oven,quantity:1}])]);
  assert.equal(quote.base_price_minor,100000);assert.equal(quote.addons_minor,65000);assert.equal(quote.service_price_minor,165000);
  assert.equal(quote.commission_minor+quote.provider_gross_minor,165000);assert.equal(quote.total_minor,165000+quote.customer_fee_minor);
  assert.deepEqual(quote.addons.map(a=>[a.name,a.quantity,a.total_minor]),[['TEST Cam',2,30000],['TEST Fırın içi',1,35000]]);
  for(const bad of [[{id:hidden,quantity:1}],[{id:foreign,quantity:1}],[{id:oven,quantity:2}],[{id:window,quantity:1},{id:window,quantity:1}],[{id:'x',quantity:1}],[{id:window,quantity:0}],'{"a":1}'])
   await fails('select commerce_quote_basket($1,$2)',[offer,typeof bad==='string'?bad:JSON.stringify(bad)],/invalid_addons/);
  checks.push('Direct purchase: basket price computed server-side; inactive, foreign-service, duplicate, over-limit and malformed extras rejected');

  // Kapıda ödeme: sipariş hemen CONFIRMED, ödeme UNPAID; anlık görüntü değiştirilemez; ustaya bildirim yazılır.
  await as('anon');
  await fails("select commerce_place_order($1,$2,$3,'TEST adres satırı 10+',$4,165000,'[]','PAY_AT_DOOR',null,false,'fuwu-fees-v1','mesafeli-hizmet-2026-11-24',true)",[offer,slots[0].starts_at,district,randomUUID()],/permission denied/);
  await as('authenticated',customer);
  const key=randomUUID();
  const place=(starts,total,addons,method,k=key,note=null)=>scalar("select commerce_place_order($1,$2,$3,'TEST Moda Mah. Örnek Sok. No 1 D 2',$4,$5,$6,$7,$8,false,'fuwu-fees-v1','mesafeli-hizmet-2026-11-24',true)",[offer,starts,district,k,total,JSON.stringify(addons),method,note]);
  await fails("select commerce_place_order($1,$2,$3,'TEST Moda Mah. Örnek Sok. No 1 D 2',$4,165000,'[]','CASH',null,false,'fuwu-fees-v1','mesafeli-hizmet-2026-11-24',true)",[offer,slots[0].starts_at,district,randomUUID()],/invalid_payment_method/);
  await fails('select 1 from (select commerce_place_order($1,$2,$3,$4,$5,$6,$7,$8,$9,false,$10,$11,true)) x',[offer,slots[0].starts_at,district,'TEST Moda Mah. Örnek Sok. No 1 D 2',randomUUID(),100000,JSON.stringify([{id:oven,quantity:1}]),'PAY_AT_DOOR',null,'fuwu-fees-v1','mesafeli-hizmet-2026-11-24'],/price_changed/);
  const order=await place(slots[0].starts_at,quote.total_minor,[{id:oven,quantity:1},{id:window,quantity:2}],'PAY_AT_DOOR',key,'Kapı zili bozuk, arayın.');
  assert.equal(order.status,'CONFIRMED');assert.equal(order.payment_status,'UNPAID');assert.equal(order.payment_method,'PAY_AT_DOOR');
  assert.equal(order.base_price_minor,100000);assert.equal(order.addons_minor,65000);assert.equal(order.service_price_minor,165000);assert.equal(order.addons.length,2);
  assert.equal(order.customer_note,'Kapı zili bozuk, arayın.');
  assert.equal((await place(slots[0].starts_at,quote.total_minor,[{id:oven,quantity:1},{id:window,quantity:2}],'PAY_AT_DOOR',key)).id,order.id,'idempotent retry');
  await fails("select commerce_place_order($1,$2,$3,'TEST Moda Mah. Örnek Sok. No 1 D 2',$4,$5,'[]','CARD',null,false,'fuwu-fees-v1','mesafeli-hizmet-2026-11-24',true)",[offer,slots[0].starts_at,district,key,quote.total_minor],/idempotency_conflict/);
  // Aynı saat ikinci kez satılamaz.
  await as('authenticated',other);
  await fails("select commerce_place_order($1,$2,$3,'TEST Başka Mah. Sok. No 5 D 1',$4,100000,'[]','PAY_AT_DOOR',null,false,'fuwu-fees-v1','mesafeli-hizmet-2026-11-24',true)",[offer,slots[0].starts_at,district,randomUUID()],/slot_unavailable/);
  await as('postgres');
  assert.equal(Number(await scalar("select count(*) from notifications where entity_id=$1 and recipient_user_id=$2 and title='Yeni hizmet randevusu'",[order.id,owner])),1);
  await fails("update commerce_orders set addons='[]',addons_minor=0,base_price_minor=165000 where id=$1",[order.id],/immutable_order_price/);
  await fails("update commerce_orders set payment_method='CARD' where id=$1",[order.id],/immutable_order_price/);
  await fails("update commerce_orders set total_minor=1000 where id=$1",[order.id],/immutable_order_price/);
  checks.push('Direct purchase: pay-at-door order confirms immediately (UNPAID), notifies the provider, stores immutable extras/note snapshot, is idempotent and blocks the slot');

  // Kart: iyzico hesabı olmayan ustada kart siparişi beklemede kalır ama ödeme başlatılamaz.
  await as('authenticated',customer);
  const cardOrder=await place(slots[slots.length-1].starts_at,100000,[],'CARD',randomUUID());
  assert.equal(cardOrder.status,'PENDING_PAYMENT');assert.equal(cardOrder.payment_method,'CARD');
  await fails('select commerce_begin_payment($1)',[cardOrder.id],/offering_unavailable|forbidden|permission denied/);
  checks.push('Direct purchase: card orders stay PENDING_PAYMENT and cannot start iyzico payment for a provider without an active sub-merchant');

  // Mutabakat kapıda ödemeyi "ödenmemiş onaylı sipariş" diye işaretlemez; finans ayrı gösterir.
  await as('authenticated',admin);
  const recon=await scalar('select commerce_admin_reconciliation(1)');
  assert.equal(recon.orders.some(o=>o.id===order.id),false);
  const summary=await scalar('select commerce_admin_summary()');
  assert.equal(Number(summary.door_open_count),1);
  checks.push('Direct purchase: reconciliation ignores pay-at-door orders; admin summary reports open door orders separately');

  // Akış: usta yola çıkar → müşteri kapı kodu verir → usta başlar → tamamlar → müşteri onaylar → PAID.
  await as('postgres');
  // Randevu saatini kapı kodu penceresine taşı (yalnızca test veritabanında).
  await db.query("update commerce_orders set starts_at=now()+interval '30 minutes',ends_at=now()+interval '90 minutes' where id=$1",[order.id]);
  {
   await as('authenticated',owner);await scalar("select commerce_transition_order($1,'PROVIDER_ON_THE_WAY')",[order.id]);
   await as('authenticated',customer);const code=(await scalar('select trust_issue_service_code($1)',[order.id])).code;
   await as('authenticated',owner);await scalar("select commerce_transition_order($1,'IN_PROGRESS',$2)",[order.id,code]);
   await scalar("select commerce_transition_order($1,'COMPLETED')",[order.id]);
   await as('authenticated',customer);const done=await scalar("select commerce_transition_order($1,'COMPLETED')",[order.id]);
   assert.equal(done.status,'COMPLETED');
   await as('postgres');
   const paid=await row('select payment_status,door_payment_collected_at from commerce_orders where id=$1',[order.id]);
   assert.equal(paid.payment_status,'PAID');assert.ok(paid.door_payment_collected_at);
   await as('authenticated',owner);
   const fin=await scalar('select commerce_provider_finance($1)',[pid]);
   assert.equal(Number(fin.door_completed_count),1);assert.equal(Number(fin.door_collected_minor),quote.total_minor);
   assert.equal(Number(fin.door_platform_due_minor),quote.commission_minor+quote.customer_fee_minor);
   assert.equal(Number(fin.pending_minor),0,'no card payout is promised for door orders');
   await as('authenticated',admin);
   assert.equal((await scalar('select commerce_admin_reconciliation(1)')).orders.some(o=>o.id===order.id),false);
   checks.push('Direct purchase: door code → start → completion → customer confirmation marks pay-at-door PAID once; provider sees collected amount and FUWU share, never a card payout');
  }

  // İptal: başlamadan önce kapıda ödemeli sipariş ücretsiz iptal edilir, iade süreci açılmaz.
  await as('authenticated',customer);
  const later=slots.find(s=>new Date(s.starts_at)-Date.now()>6*3600*1000) ?? slots[Math.floor(slots.length/2)];
  const cancelMe=await place(later.starts_at,100000,[],'PAY_AT_DOOR',randomUUID());
  const cancelled=await scalar("select commerce_transition_order($1,'CANCELLED')",[cancelMe.id]);
  assert.equal(cancelled.status,'CANCELLED');
  checks.push('Direct purchase: customer cancels an upcoming pay-at-door order without a refund process');

  // Admin ekstra yönetimi: yalnızca admin, denetim kaydıyla.
  await as('authenticated',other);
  await fails("select commerce_admin_save_addon($1)",[JSON.stringify({service_id:service,slug:'yeni',name:'TEST Yeni',price_minor:'20000'})],/forbidden/);
  await fails('insert into service_addons(service_id,slug,name,price_minor) values($1,$2,$3,$4)',[service,'x','TEST x',100],/permission denied/);
  await as('authenticated',admin);
  const saved=await scalar("select commerce_admin_save_addon($1)",[JSON.stringify({service_id:service,slug:'yeni',name:'TEST Yeni',price_minor:'20000',max_quantity:'2'})]);
  await fails("select commerce_admin_save_addon($1)",[JSON.stringify({service_id:service,slug:'Bad Slug',name:'TEST',price_minor:'20000'})],/invalid_addon/);
  await as('postgres');
  assert.equal(Number(await scalar("select count(*) from audit_logs where action='catalog.addon.saved' and metadata->>'addon_id'=$1",[saved])),1);
  await as('anon');
  assert.equal(Number(await scalar('select count(*) from service_addons where id=$1',[hidden])),0,'inactive extras hidden from public');
  checks.push('Direct purchase: only admins manage extras (audited); browsers cannot write; inactive extras are not public');

  // Kapıda ödeme admin ayarıyla kapatılabilir.
  await as('postgres');await db.query("update app_settings set value='false' where key='pay_at_door_enabled'");
  await as('authenticated',customer);
  await fails("select commerce_place_order($1,$2,$3,'TEST Moda Mah. Örnek Sok. No 1 D 2',$4,100000,'[]','PAY_AT_DOOR',null,false,'fuwu-fees-v1','mesafeli-hizmet-2026-11-24',true)",[offer,slots[Math.max(1,slots.length-3)].starts_at,district,randomUUID()],/pay_at_door_closed/);
  checks.push('Direct purchase: pay-at-door can be switched off from app settings without a deploy');
 } finally {
  await db.query('reset role');
  await db.query('rollback');
 }
}
