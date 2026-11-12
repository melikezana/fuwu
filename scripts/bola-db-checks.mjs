import assert from "node:assert/strict";
import fs from "node:fs/promises";

// 10 Kasım 2026 denetimi · "Admin ve usta RPC çağrılarında yetkisiz erişim / başka kullanıcının kaydını düzenleme (BOLA / IDOR)".
// Yabancı bir oturum, kurbanın usta ve başvuru kimlikleriyle API'den çağrılabilen her SECURITY DEFINER fonksiyonunu dener.
// Yalnızca tam migration zinciri uygulanmış, tek kullanımlık PostgreSQL üzerinde çalışır.
export async function bolaChecks(db, checks) {
  const victim = "b0000000-0000-4000-8000-000000000001", attacker = "b0000000-0000-4000-8000-000000000002";
  const provider = "b0000000-0000-4000-8000-0000000000aa", application = "b0000000-0000-4000-8000-0000000000bb", unknown = "b0000000-0000-4000-8000-0000000000cc";
  const rows = async (sql, values = []) => (await db.query(sql, values)).rows;
  await db.query("insert into auth.users(id,email) values($1,'bola-victim@fuwu.test'),($2,'bola-attacker@fuwu.test')", [victim, attacker]);
  await db.query("insert into public.providers(id,user_id,name,phone,description,category_id,district_id,is_active,is_approved) select $1,$2,'BOLA Victim','+905590001111','BOLA victim provider used only for isolation checks.',c.id,d.id,true,true from public.service_categories c cross join public.districts d where c.is_active and d.is_active limit 1", [provider, victim]);
  await db.query("insert into public.provider_applications(id,user_id,full_name,phone,category_id,district_id,experience_years,availability,has_equipment,introduction,status) select $1,$2,'BOLA Victim','+905590001111',c.id,d.id,5,'weekdays',true,'BOLA victim application used only for isolation checks.','pending' from public.service_categories c cross join public.districts d where c.is_active and d.is_active limit 1", [application, victim]);
  const snapshot = async () => JSON.stringify(await rows(`select (select to_jsonb(p) from public.providers p where p.id=$1) provider, (select to_jsonb(a) from public.provider_applications a where a.id=$2) application,
    (select count(*)::int from public.provider_service_offerings where provider_id=$1) offerings, (select count(*)::int from public.provider_availability where provider_id=$1) hours,
    (select count(*)::int from public.provider_application_source_reviews where application_id=$2) sources`, [provider, application]));
  const before = await snapshot();
  const matrix = new Map(JSON.parse(await fs.readFile("docs/security/security-definer-matrix.json", "utf8")).functions.map(item => [item.function, item.guard]));
  const functions = await rows(`select p.oid::regprocedure::text sig, p.proname, coalesce(p.proargnames,'{}') names, (select coalesce(array_agg(t::regtype::text order by i),'{}') from unnest(p.proargtypes::oid[]) with ordinality u(t,i)) types
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef and p.prorettype<>'trigger'::regtype and has_function_privilege('authenticated',p.oid,'execute') order by 1`);
  const argument = (type, name = "") => type === "uuid" ? `'${/provider/.test(name) ? provider : /application/.test(name) ? application : unknown}'::uuid`
    : type === "jsonb" ? "'[]'::jsonb" : type === "text" ? "'bola-probe-text-value'" : ["integer", "smallint"].includes(type) ? `1::${type}` : type === "boolean" ? "true" : `null::${type}`;
  // Hata vermeden dönebilen, yalnızca çağıranın kendi durumunu ya da boş sonucu bildiren yanıtlar.
  const harmless = new Set(["[]", "{}", "0", "true", "false", null]);
  const leaks = [];
  let denied = 0, probed = 0;
  await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role','authenticated',false)", [attacker]);
  await db.query("set role authenticated");
  try {
    for (const fn of functions) {
      const guard = matrix.get(fn.sig);
      if (guard === "public" || guard === "policy-helper") continue;
      probed++;
      const call = `select x::text v from public.${fn.proname}(${fn.types.map((type, index) => argument(type, fn.names[index])).join(",")}) x limit 1`;
      try {
        const value = (await db.query(call)).rows[0]?.v ?? null;
        if (!harmless.has(value)) leaks.push(`${fn.sig} → ${String(value).slice(0, 80)}`);
      } catch (error) {
        if (guard === "admin" && /^(admin_|commerce_admin_|trust_admin_|trust_save_|trust_resolve_|trust_review_)/.test(fn.proname)) assert.equal(error.code, "42501", `${fn.sig}: admin olmayan çağrı 42501 ile reddedilmeli (${error.code} ${error.message})`);
        denied++;
      }
    }
    // Doğrudan tablo erişimi (RLS): yabancı kullanıcı kurbanın kaydını göremez, değiştiremez, silemez.
    assert.equal((await db.query("update public.providers set name='BOLA Hijacked' where id=$1", [provider])).rowCount, 0);
    assert.equal((await db.query("select id from public.provider_applications where id=$1", [application])).rowCount, 0);
    assert.equal(await db.query("update public.provider_applications set status='approved' where id=$1", [application]).then(result => result.rowCount, () => 0), 0);
    assert.equal(await db.query("delete from public.provider_applications where id=$1", [application]).then(result => result.rowCount, () => 0), 0);
    await assert.rejects(db.query("select * from public.provider_application_source_reviews"), /permission denied/);
  } finally {
    await db.query("reset role");
    await db.query("select set_config('request.jwt.claim.sub','',false),set_config('request.jwt.claim.role','',false)");
  }
  assert.deepEqual(leaks, [], "Yabancı oturuma veri döndüren fonksiyon var");
  assert.equal(await snapshot(), before, "Kurbanın usta ve başvuru kayıtları değişmemeli");
  checks.push(`BOLA/IDOR: a foreign session probed ${probed} of ${functions.length} API-callable definer functions (all except intentionally public ones) with a victim's provider and application ids; ${denied} rejected, ${probed - denied} returned only an empty or caller-scoped result, none returned victim data, victim rows unchanged; direct table update/delete blocked by RLS`);

  // Başvuru kaynak kararı: yalnızca admin, gerekçe zorunlu, denetim kaydı düşer, başvuru satırı değişmez.
  const admin = "b0000000-0000-4000-8000-000000000003";
  await db.query("insert into auth.users(id,email) values($1,'bola-admin@fuwu.test')", [admin]);
  await db.query("update public.profiles set role='admin' where id=$1", [admin]);
  await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role','authenticated',false)", [admin]);
  await db.query("set role authenticated");
  try {
    assert.equal((await rows("select public.admin_application_sources() s"))[0].s[application].source_kind, "unclassified");
    await assert.rejects(db.query("select public.admin_classify_application($1,'demo','Geçersiz tür denemesi için not.')", [application]), /invalid_classification/);
    await assert.rejects(db.query("select public.admin_classify_application($1,'test','kısa')", [application]), /invalid_classification/);
    await assert.rejects(db.query("select public.admin_classify_application($1,'test','Var olmayan başvuru denemesi.')", [unknown]), /application_not_found/);
    await db.query("select public.admin_classify_application($1,'test','Ekip içi deneme başvurusu; gerçek usta değil.')", [application]);
    await db.query("select public.admin_classify_application($1,'real','Telefonla teyit edildi; gerçek usta başvurusu.')", [application]);
    const summary = (await rows("select public.admin_application_sources() s"))[0].s[application];
    assert.equal(summary.source_kind, "real"); assert.equal(summary.linked, true); assert.equal(summary.has_provider, true);
  } finally {
    await db.query("reset role");
    await db.query("select set_config('request.jwt.claim.sub','',false),set_config('request.jwt.claim.role','',false)");
  }
  const audit = await rows("select metadata from public.audit_logs where action='application.source_classified' and entity_id=$1 order by created_at", [application]);
  assert.deepEqual(audit.map(row => [row.metadata.previous, row.metadata.source_kind]), [["unclassified", "test"], ["test", "real"]]);
  assert.ok(!JSON.stringify(audit).includes("Telefonla"), "denetim kaydı serbest metin notu taşımamalı");
  assert.equal((await rows("select status from public.provider_applications where id=$1", [application]))[0].status, "pending");
  checks.push("Application source review: admin-only, reason required, reversible, audited without free text; application status and provider record untouched");
}
