import assert from "node:assert/strict";

// Runs against ALL actual migrations, with only Supabase platform DDL stubbed.
// These are real PostgreSQL grants, triggers and RLS, not repository mocks.
export async function securitySchemaChecks(db, checks) {
  const owner="98000000-0000-4000-8000-000000000001", other="98000000-0000-4000-8000-000000000002";
  await db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,'security-owner@fuwu.test',$3),($2,'security-other@fuwu.test','{}')",[owner,other,{role:"admin",is_admin:true}]);
  assert.equal((await db.query("select role from profiles where id=$1",[owner])).rows[0]?.role,"customer");
  checks.push("Security schema: actual signup trigger ignores user_metadata role escalation");
  // Supabase Storage's platform grants are absent from the tiny DDL shim.
  await db.query("grant select,insert,update,delete on storage.objects to authenticated; grant select on storage.objects to anon");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
  await db.query("set role authenticated");
  try {
    await assert.rejects(db.query("update profiles set role='admin' where id=auth.uid()"),/role|permission denied|forbidden/);
    await assert.rejects(db.query("select commerce_admin_summary()"),/forbidden/);
    checks.push("Security schema: real profile ACL/trigger and admin RPC reject customer");
    await db.query("insert into storage.objects(bucket_id,name) values('provider-verification-documents',$1)",[owner+"/provider-applications/fixture.pdf"]);
    assert.equal((await db.query("select count(*)::int n from storage.objects where bucket_id='provider-verification-documents'")).rows[0].n,1);
    await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values('provider-verification-documents',$1)",[other+"/stolen.pdf"]),/row-level security/);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);
    assert.equal((await db.query("select count(*)::int n from storage.objects where bucket_id='provider-verification-documents'")).rows[0].n,0);
    checks.push("Security schema: private verification document actual RLS permits owner, denies other user/path spoofing");
  } finally {await db.query("reset role");}
  await db.query("set role anon");
  try {assert.equal((await db.query("select count(*)::int n from storage.objects where bucket_id='provider-verification-documents'")).rows[0].n,0);}
  finally {await db.query("reset role");}
  const buckets=(await db.query("select id,public,file_size_limit,allowed_mime_types from storage.buckets where id in ('provider-images','provider-verification-documents') order by id")).rows;
  assert.equal(buckets.length,2);
  const docs=buckets.find(b=>b.id==='provider-verification-documents');
  assert.equal(docs.public,false);assert.equal(Number(docs.file_size_limit),5242880);assert.deepEqual(docs.allowed_mime_types,['application/pdf','image/jpeg','image/png']);
  checks.push("Security schema: anonymous document access denied; private bucket MIME/size configuration verified (not Storage HTTP)");
}
