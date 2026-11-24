-- FUWU · Ödeme online kartla alınır (iyzico pazaryeri). Kapıda ödeme varsayılan olarak kapanır.
-- Ayar admin panelinden ("Kapıda ödeme (geçici)") yeniden açılabilir; kapalıyken veritabanı kapıda ödemeli siparişi
-- `pay_at_door_closed` ile reddeder (commerce_place_order). Mevcut kapıda ödemeli siparişler etkilenmez.
-- İki taraflı gelir: müşteri hizmet bedeli (customer_fee_rate, fiyata dahil) + usta komisyonu (commission_rate); oranlar
-- admin ayarlarından gelir ve siparişe değiştirilemez olarak yazılır.
begin;
insert into public.app_settings(key,value) values('pay_at_door_enabled','false')
on conflict(key) do update set value='false',updated_at=now();
-- Eski kurulum tohumu commission_rate='0.10' (kesir, %10 kastıyla) 20261028'den beri yüzde okunur ve %0,1 olur.
-- Yalnızca bu eski değer kastedilen %10'a çevrilir; admin panelinden girilmiş başka bir değer değişmez.
update public.app_settings set value='10',updated_at=now() where key='commission_rate' and value in ('0.10','0.1','0,10','0,1');
commit;
