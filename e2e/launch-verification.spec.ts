import {expect,test} from './fixtures';
import {authenticatedTestClient,confirmApplicationPhone,ensureTestUserRole,setCheckboxReliably,expectUnavailableProfile,getTestAdminClient,loginWithEmailMagicLink,skipUnlessLocalSupabase,uniqueE2EEmail,uniqueE2EPhone} from './helpers';

test.describe('CTO launch verification',()=>{
 test.beforeEach(()=>skipUnlessLocalSupabase());
 test('filtered provider empty state preserves category and preselects the catalog',async({page})=>{
  await page.goto('/providers?category=cilingir&district=Adalar&q=E2E-no-match-'+crypto.randomUUID());
  await expect(page.locator('select[name="category"]')).toHaveValue('cilingir');await expect(page.locator('select[name="district"]')).toHaveValue('Adalar');
  const empty=page.getByTestId('provider-category-district-empty-state');await expect(empty.getByRole('heading',{name:'Bu bölgede henüz Çilingir ustası yok',exact:true})).toBeVisible();
  const discover=empty.getByRole('link',{name:'Hizmetleri Keşfet',exact:true});await expect(discover).toHaveAttribute('href','/services?district=Adalar&category=cilingir');await discover.click();
  await expect(page).toHaveURL(url=>url.pathname==='/services'&&url.searchParams.get('category')==='cilingir'&&url.searchParams.get('district')==='Adalar');await expect(page.getByTestId('request-form')).toHaveCount(0);
 });
 test('partner application, admin approval and preserved legacy assignment acceptance reach real records',async({browser})=>{
  test.setTimeout(120000);const db=getTestAdminClient(), email=uniqueE2EEmail('launch-partner'),owner=await ensureTestUserRole(email,'customer'),phone=await uniqueE2EPhone();
  const verified=await db.auth.admin.updateUserById(owner,{phone,phone_confirm:true});expect(verified.error).toBeNull();
  const context=await browser.newContext(),adminContext=await browser.newContext(),publicContext=await browser.newContext();
  try {
   const page=await context.newPage();await loginWithEmailMagicLink(page,{email,nextPath:'/provider-application'});
   const form=page.getByRole('form', { name: 'FUWU Partner başvurusu', exact: true });await expect(form.getByRole('button',{name:'Başvurumu gönder',exact:true})).toBeEnabled();
   await form.getByLabel('Ad soyad',{exact:true}).fill('E2E Launch Partner '+owner.slice(0,8));await form.getByLabel('Cep telefonu',{exact:true}).fill(phone);await form.locator('[name="categoryId"]').selectOption({label:'Çilingir'});await form.locator('[name="districtId"]').selectOption({label:'Kadıköy'});
   await confirmApplicationPhone(form);await setCheckboxReliably(form.getByRole('checkbox',{name:'Başvuru aydınlatma metnini okudum, bilgi edindim.',exact:true}),true);await form.getByRole('button',{name:'Başvurumu gönder',exact:true}).click();
   await expect(page.getByRole('heading',{name:'Başvurun değerlendirmede',exact:true})).toBeVisible();
   const application=await db.from('provider_applications').select('id,status').eq('user_id',owner).single();expect(application.error).toBeNull();expect(application.data?.status).toBe('pending');
   const ownerClient=await authenticatedTestClient(page);await ownerClient.from('provider_applications').update({status:'approved'}).eq('id',application.data!.id);
   expect((await db.from('provider_applications').select('status').eq('id',application.data!.id).single()).data?.status).toBe('pending');
   const adminPage=await adminContext.newPage();await loginWithEmailMagicLink(adminPage,{email:uniqueE2EEmail('launch-admin'),role:'admin',nextPath:'/admin/provider-applications/'+application.data!.id});
   adminPage.once('dialog',dialog=>dialog.accept());await adminPage.getByRole('button',{name:'Onayla',exact:true}).click();
   await expect(adminPage.getByRole('status').filter({hasText:'Başvuru onaylandı. Belge ve yayın incelemesi ayrıca tamamlanmalı.'})).toBeVisible();
   await expect.poll(async()=>(await db.from('provider_applications').select('status').eq('id',application.data!.id).single()).data?.status).toBe('approved');
   const provider=await db.from('providers').select('id,user_id,category_id,district_id,is_active,is_approved').eq('user_id',owner).single();expect(provider.error).toBeNull();expect(provider.data).toMatchObject({user_id:owner,is_active:true,is_approved:true});
   const publicPage=await publicContext.newPage();await expectUnavailableProfile(publicPage,provider.data!.id); // Application approval never fabricates editorial approval.
   const customer=await ensureTestUserRole(uniqueE2EEmail('legacy-owner'),'customer'), requestId=crypto.randomUUID();
   const request=await db.from('service_requests').insert({id:requestId,user_id:customer,category_id:provider.data!.category_id,district_id:provider.data!.district_id,address:'E2E preserved legacy synthetic address',description:'E2E historical request acceptance regression',status:'assigned',assigned_provider_id:provider.data!.id,assigned_at:new Date().toISOString(),payment_preference:'cash',confirmation_code:'123456'});expect(request.error).toBeNull();
   await page.goto('/provider-dashboard/requests');const card=page.locator('article:visible').filter({hasText:requestId});await expect(card).toBeVisible();await card.getByRole('button',{name:'Kabul Et',exact:true}).click();
   await expect.poll(async()=>(await db.from('service_requests').select('status').eq('id',requestId).single()).data?.status).toBe('accepted');
   const audit=await db.from('audit_logs').select('id').eq('entity_id',application.data!.id);expect(audit.error).toBeNull();expect(audit.data?.length).toBeGreaterThan(0);
  } finally {await context.close();await adminContext.close();await publicContext.close();}
 });
 test('admin rejects a pending application, preserves its history and denies applicant approval or rejection',async({page,browser})=>{
  const db=getTestAdminClient(),email=uniqueE2EEmail('rejected-applicant'),owner=await ensureTestUserRole(email,'customer'),id=crypto.randomUUID();
  const category=await db.from('service_categories').select('id').eq('is_active',true).limit(1).single(),district=await db.from('districts').select('id').eq('is_active',true).limit(1).single();expect(category.error).toBeNull();expect(district.error).toBeNull();
  const inserted=await db.from('provider_applications').insert({id,user_id:owner,full_name:'E2E Rejected Applicant '+id.slice(0,8),phone:await uniqueE2EPhone(),category_id:category.data!.id,district_id:district.data!.id,status:'pending'});expect(inserted.error).toBeNull();
  const applicantContext=await browser.newContext();try {
   const applicant=await applicantContext.newPage();await loginWithEmailMagicLink(applicant,{email});const client=await authenticatedTestClient(applicant);
   for(const status of ['approved','rejected']) {await client.from('provider_applications').update({status}).eq('id',id);expect((await db.from('provider_applications').select('status').eq('id',id).single()).data?.status).toBe('pending');}
   await loginWithEmailMagicLink(page,{email:uniqueE2EEmail('rejection-admin'),role:'admin',nextPath:'/admin/provider-applications/'+id});page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Reddet',exact:true}).click();
   await expect(page.getByRole('status').filter({hasText:'Başvuru reddedildi.'})).toBeVisible();
   const saved=await db.from('provider_applications').select('status,user_id').eq('id',id).single();expect(saved.error).toBeNull();expect(saved.data).toMatchObject({status:'rejected',user_id:owner});
   const audit=await db.from('audit_logs').select('id').eq('entity_id',id).eq('action','provider_application.rejected');expect(audit.error).toBeNull();expect(audit.data).toHaveLength(1);
   expect((await db.from('providers').select('id').eq('user_id',owner)).data).toEqual([]);
   await page.goto('/admin/provider-applications/'+id);await expect(page.getByRole('button',{name:'Reddet',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Onayla',exact:true})).toBeDisabled();
   const publicGate=await client.rpc('provider_publication_gate');expect(publicGate.error).toBeNull();expect(publicGate.data.some((p:{name:string})=>p.name==='E2E Rejected Applicant '+id.slice(0,8))).toBe(false);
  }finally{await applicantContext.close();}
 });
});
