import { expect, test } from './fixtures';
import { authenticatedTestClient, ensureTestUserRole, getTestAdminClient, loginWithEmailMagicLink, setCheckboxReliably, skipUnlessLocalSupabase, uniqueE2EEmail } from './helpers';

// KVKK İlke Kararı 2026/347: aydınlatma beyanı ve ticari e-posta onayı ayrı adım, ayrı kayıt.
test('notice acknowledgement and e-mail consent are separate, persisted once, admin-visible and withdrawable on their own', async ({page,browser})=>{
 skipUnlessLocalSupabase();
 const email=uniqueE2EEmail('interest'), id=await ensureTestUserRole(email,'customer'), db=getTestAdminClient();
 const enable=await db.from('app_settings').upsert({key:'launch_interest_enabled',value:'true'});expect(enable.error).toBeNull();
 const marketingOff=await db.from('app_settings').upsert({key:'launch_marketing_email_enabled',value:'false'});expect(marketingOff.error).toBeNull();
 try {
  await loginWithEmailMagicLink(page,{email,nextPath:'/waitlist'});
  await expect(page.getByLabel('E-posta adresin')).toHaveValue(email);
  // Aydınlatma metni sayfadan çıkmadan okunur; tam metin yeni sekmede açılır.
  await page.getByText('Metni oku',{exact:true}).click();
  await expect(page.getByRole('heading',{name:'Veri sorumlusu',exact:true})).toBeVisible();
  const full=page.getByRole('link',{name:'Tam metni yeni sekmede aç',exact:true});
  await expect(full).toHaveAttribute('href','/kvkk#launch-interest');await expect(full).toHaveAttribute('target','_blank');
  await expect(page).toHaveURL(/\/waitlist$/);
  // E-posta onayı kapalıyken onay kutusu yok; talep yine kaydedilir.
  await expect(page.getByRole('checkbox',{name:/ticari elektronik ileti/})).toHaveCount(0);
  await setCheckboxReliably(page.getByRole('checkbox',{name:'Aydınlatma metnini okudum, bilgi edindim.',exact:true}),true);
  await page.getByRole('button',{name:'Talebimi kaydet',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Talebin kaydedildi');
  const first=await db.from('launch_interest').select('*').eq('user_id',id).single();
  expect(first.error).toBeNull(); expect(first.data).toMatchObject({email,withdrawn_at:null,marketing_email_consent:false,notice_version:'aydinlatma-acilis-2026-11-13'});

  const marketingOn=await db.from('app_settings').upsert({key:'launch_marketing_email_enabled',value:'true'});expect(marketingOn.error).toBeNull();
  await page.reload();
  await expect(page.getByRole('heading',{name:'Talebin kayıtlı.',exact:true})).toBeVisible();
  await setCheckboxReliably(page.getByRole('checkbox',{name:'Aydınlatma metnini okudum, bilgi edindim.',exact:true}),true);
  await setCheckboxReliably(page.getByRole('checkbox',{name:/ticari elektronik ileti gönderilmesine onay veriyorum/}),true);
  await page.getByRole('button',{name:'Tercihlerimi güncelle',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('e-posta onayın kaydedildi');
  const count=await db.from('launch_interest').select('id,marketing_email_consent').eq('user_id',id);expect(count.error).toBeNull();expect(count.data).toEqual([{id:first.data!.id,marketing_email_consent:true}]);

  const context=await browser.newContext();
  try {
   const other=await context.newPage();await loginWithEmailMagicLink(other,{email:uniqueE2EEmail('interest-other')});
   const stranger=await authenticatedTestClient(other);
   const denied=await stranger.from('launch_interest').select('*').eq('user_id',id);expect(denied.error).toBeNull();expect(denied.data).toHaveLength(0);
   await loginWithEmailMagicLink(other,{email:uniqueE2EEmail('interest-admin'),role:'admin',nextPath:'/admin'});
   const admin=await authenticatedTestClient(other), snapshot=await admin.rpc('admin_prelaunch_snapshot');
   expect(snapshot.error).toBeNull(); expect(snapshot.data.interest).toBeGreaterThan(0);
  } finally {await context.close();}

  await page.getByRole('button',{name:'E-posta onayımı geri çek',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('E-posta onayın geri çekildi');
  const kept=await db.from('launch_interest').select('withdrawn_at,marketing_email_consent').eq('user_id',id).single();expect(kept.data).toEqual({withdrawn_at:null,marketing_email_consent:false});
  await page.getByRole('button',{name:'Talebimi kaldır',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Talebin kaldırıldı');
  const after=await db.from('launch_interest').select('withdrawn_at').eq('user_id',id).single();expect(after.error).toBeNull();expect(after.data?.withdrawn_at).not.toBeNull();
  const consent=await db.from('launch_interest_consent_events').select('event').eq('interest_id',first.data!.id);expect(consent.error).toBeNull();
  expect(consent.data).toEqual(expect.arrayContaining([{event:'granted'},{event:'notice_acknowledged'},{event:'marketing_granted'},{event:'marketing_withdrawn'},{event:'withdrawn'}]));
 } finally {
  await db.from('app_settings').upsert({key:'launch_marketing_email_enabled',value:'false'});
 }
});
