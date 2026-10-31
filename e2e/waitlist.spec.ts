import { expect, test } from './fixtures';
import { authenticatedTestClient, ensureTestUserRole, getTestAdminClient, loginWithEmailMagicLink, skipUnlessLocalSupabase, uniqueE2EEmail } from './helpers';

test('verified customer consent persists once, appears for admin, denies strangers and can be withdrawn', async ({page,browser})=>{
 skipUnlessLocalSupabase();
 const email=uniqueE2EEmail('interest'), id=await ensureTestUserRole(email,'customer'), db=getTestAdminClient();
 const enable=await db.from('app_settings').upsert({key:'launch_interest_enabled',value:'true'});expect(enable.error).toBeNull();
 await loginWithEmailMagicLink(page,{email,nextPath:'/waitlist'});
 await expect(page.getByLabel('E-posta adresin')).toHaveValue(email);
 await expect(page.getByRole('link',{name:'KVKK aydınlatmasından'})).toHaveAttribute('href','/kvkk#launch-interest');
 await page.getByRole('checkbox').check();
 await page.getByRole('button',{name:'Haberdar Ol',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('kaydedildi');
 const first=await db.from('launch_interest').select('*').eq('user_id',id).single();
 expect(first.error).toBeNull(); expect(first.data).toMatchObject({email,withdrawn_at:null});
 await page.getByRole('button',{name:'Haberdar Ol',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('kaydedildi');
 const count=await db.from('launch_interest').select('id').eq('user_id',id);expect(count.error).toBeNull();expect(count.data).toHaveLength(1);
 const context=await browser.newContext();
 try {
  const other=await context.newPage();await loginWithEmailMagicLink(other,{email:uniqueE2EEmail('interest-other')});
  const stranger=await authenticatedTestClient(other);
  const denied=await stranger.from('launch_interest').select('*').eq('user_id',id);expect(denied.error).toBeNull();expect(denied.data).toHaveLength(0);
  await loginWithEmailMagicLink(other,{email:uniqueE2EEmail('interest-admin'),role:'admin',nextPath:'/admin'});
  const admin=await authenticatedTestClient(other), snapshot=await admin.rpc('admin_prelaunch_snapshot');
  expect(snapshot.error).toBeNull(); expect(snapshot.data.interest).toBeGreaterThan(0);
 } finally {await context.close();}
 await page.getByRole('button',{name:'İletişim iznimi geri çek',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('geri çekildi');
 const after=await db.from('launch_interest').select('withdrawn_at').eq('user_id',id).single();expect(after.error).toBeNull();expect(after.data?.withdrawn_at).not.toBeNull();
 const consent=await db.from('launch_interest_consent_events').select('event').eq('interest_id',first.data!.id);expect(consent.error).toBeNull();expect(consent.data).toEqual(expect.arrayContaining([{event:'granted'},{event:'withdrawn'}]));
});
