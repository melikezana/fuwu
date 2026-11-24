import { expect, test } from './fixtures';
import { authenticatedTestClient, ensureTestUserRole, getTestAdminClient, loginWithEmailMagicLink, skipUnlessLocalSupabase, uniqueE2EEmail } from './helpers';

// 24 Kasım 2026: hizmetler doğrudan satın alınıyor, yeni talep toplanmıyor.
// KVKK İlke Kararı 2026/347: daha önce kayıt bırakan kişi e-posta onayını ve kaydını yine ayrı ayrı geri çekebilir.
test('waitlist no longer collects requests; existing records stay withdrawable step by step', async ({page})=>{
 skipUnlessLocalSupabase();
 const email=uniqueE2EEmail('interest'), id=await ensureTestUserRole(email,'customer'), db=getTestAdminClient();
 for(const key of ['launch_interest_enabled','launch_marketing_email_enabled']) {const r=await db.from('app_settings').upsert({key,value:'true'});expect(r.error).toBeNull();}
 try {
  await loginWithEmailMagicLink(page,{email,nextPath:'/waitlist'});
  await expect(page).toHaveURL(/\/services/);
  await expect(page.getByText(/Talep Bırak/i)).toHaveCount(0);

  const actor=await authenticatedTestClient(page);
  const saved=await actor.rpc('save_launch_interest_v2',{p_district_id:null,p_category_id:null,p_notice_version:'aydinlatma-acilis-2026-11-13',p_notice_acknowledged:true,p_marketing_email:true,p_marketing_version:'eti-eposta-2026-11-13'});
  expect(saved.error).toBeNull();
  await page.goto('/waitlist');
  await expect(page.getByRole('heading',{name:'Bilgilendirme tercihlerin',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Talebin kayıtlı.',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Tercihlerimi güncelle',exact:true})).toBeDisabled();

  await page.getByRole('button',{name:'E-posta onayımı geri çek',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('E-posta onayın geri çekildi');
  const kept=await db.from('launch_interest').select('withdrawn_at,marketing_email_consent').eq('user_id',id).single();expect(kept.data).toEqual({withdrawn_at:null,marketing_email_consent:false});
  await page.getByRole('button',{name:'Talebimi kaldır',exact:true}).click();
  // Kaldırılan kayıt yönetilecek bir şey bırakmaz; sayfa hizmetlere döner.
  await expect.poll(async()=>(await db.from('launch_interest').select('withdrawn_at').eq('user_id',id).single()).data?.withdrawn_at??null).not.toBeNull();
  await page.goto('/waitlist'); await expect(page).toHaveURL(/\/services/);
  const after=await db.from('launch_interest').select('id,withdrawn_at').eq('user_id',id).single();expect(after.error).toBeNull();
  const consent=await db.from('launch_interest_consent_events').select('event').eq('interest_id',after.data!.id);expect(consent.error).toBeNull();
  expect(consent.data).toEqual(expect.arrayContaining([{event:'marketing_withdrawn'},{event:'withdrawn'}]));
 } finally {
  await db.from('app_settings').upsert({key:'launch_marketing_email_enabled',value:'false'});
 }
});
