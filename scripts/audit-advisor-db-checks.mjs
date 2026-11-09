import assert from "node:assert/strict";
import fs from "node:fs/promises";

// 9 Kasım 2026 denetimi: Security/Performance Advisor bulgularının kalıcı kanıtı.
// Yalnızca tam migration zinciri uygulanmış, tek kullanımlık PostgreSQL üzerinde çalışır.
export async function auditAdvisorChecks(db, checks) {
  const rows = async (sql, values = []) => (await db.query(sql, values)).rows;
  const scalar = async (sql, values = []) => Object.values((await rows(sql, values))[0])[0];
  const as = async (role, id = "") => { await db.query("reset role"); await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role',$2,false)", [id, role]); await db.query(`set role ${role}`); };

  // 1) SECURITY DEFINER yüzeyi, incelenmiş matrisle birebir aynı olmalı.
  const matrix = JSON.parse(await fs.readFile("docs/security/security-definer-matrix.json", "utf8"));
  const actual = await rows(`select p.oid::regprocedure::text fn, has_function_privilege('anon',p.oid,'execute') anon, has_function_privilege('authenticated',p.oid,'execute') authenticated,
    (select c from unnest(p.proconfig) c where c like 'search_path=%') search_path, p.prosrc ~* 'current_user_is_admin' admin_guard, p.prosrc ~* 'auth\\.uid\\(\\)' session_guard
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef and (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute')) order by 1`);
  const reviewed = new Map(matrix.functions.map(item => [item.function, item]));
  assert.deepEqual(actual.map(row => row.fn).filter(fn => !reviewed.has(fn)), [], "İncelenmemiş API-çağrılabilir SECURITY DEFINER fonksiyonu: docs/security/security-definer-matrix.json güncellenmeli");
  assert.deepEqual([...reviewed.keys()].filter(fn => !actual.some(row => row.fn === fn)), [], "Matriste artık var olmayan fonksiyon");
  for (const row of actual) {
    const item = reviewed.get(row.fn);
    assert.equal(row.anon, item.anon, `${row.fn}: anon yetkisi matrisle uyuşmuyor`);
    assert.equal(row.authenticated, item.authenticated, `${row.fn}: authenticated yetkisi matrisle uyuşmuyor`);
    assert.ok(row.search_path, `${row.fn}: sabit search_path zorunlu`);
    if (item.guard === "admin") assert.ok(row.admin_guard, `${row.fn}: admin kontrolü bulunamadı`);
    if (item.guard === "session") assert.ok(row.session_guard, `${row.fn}: oturum kontrolü bulunamadı`);
    if (row.anon) assert.ok(["public", "policy-helper"].includes(item.guard), `${row.fn}: anonim çağrı yalnızca bilinçli açık fonksiyonlarda olabilir`);
  }
  assert.equal(await scalar("select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef and not exists(select 1 from unnest(coalesce(p.proconfig,'{}')) c where c like 'search_path=%')"), 0);
  assert.equal(await scalar("select has_function_privilege('anon','public.handle_new_user()','execute') or has_function_privilege('authenticated','public.handle_new_user()','execute')"), false);
  checks.push(`Audit advisor: ${actual.length} API-callable SECURITY DEFINER functions match the reviewed privilege matrix; ${actual.filter(row => row.anon).length} anonymous by design; all pin search_path`);

  // 2) Politikasız RLS tablosu kalmamalı; yalnızca-sunucu tabloları API rollerine kapalı.
  assert.deepEqual((await rows("select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and (not c.relrowsecurity or not exists(select 1 from pg_policy p where p.polrelid=c.oid)) order by 1")).map(row => row.relname), []);
  const serverOnly = ["admin_provider_action_receipts", "commerce_settlement_operations", "launch_interest_consent_events", "order_sms_dispatches", "provider_document_uploads", "provider_document_versions", "provider_publication_reviews"];
  const user = "ad000000-0000-4000-8000-000000000001", admin = "ad000000-0000-4000-8000-000000000002";
  await db.query("insert into auth.users(id,email) values($1,'audit-user@fuwu.test'),($2,'audit-admin@fuwu.test')", [user, admin]);
  assert.equal(await scalar("select role from public.profiles where id=$1", [user]), "customer");
  await db.query("update public.profiles set role='admin' where id=$1", [admin]);
  try {
    for (const role of ["anon", "authenticated"]) {
      await as(role, role === "anon" ? "" : user);
      for (const table of serverOnly) {
        const visible = await db.query(`select count(*)::int n from public.${table}`).then(result => result.rows[0].n, error => { assert.match(error.message, /permission denied/); return 0; });
        assert.equal(visible, 0, `${table}: ${role} satır görmemeli`);
      }
    }
    checks.push("Audit advisor: every public table has RLS and an explicit policy; seven server-only tables stay closed to anon and authenticated");

    // 5) Haftalık lansman ölçümleri yalnızca admin.
    await as("anon");
    await assert.rejects(db.query("select public.admin_weekly_launch_metrics(8)"), /permission denied/);
    await as("authenticated", user);
    await assert.rejects(db.query("select public.admin_weekly_launch_metrics(8)"), /forbidden/);
    await as("authenticated", admin);
    const metrics = await scalar("select public.admin_weekly_launch_metrics(8)");
    assert.equal(metrics.version, 1); assert.equal(metrics.weeks.length, 8);
    assert.equal((await scalar("select public.admin_weekly_launch_metrics(500)")).weeks.length, 26);
    assert.equal(metrics.applications.total, Number(metrics.applications.linked) + Object.values(metrics.applications.unlinked).reduce((sum, value) => sum + Number(value), 0));
    assert.ok(!JSON.stringify(metrics).includes("@"), "ölçümler e-posta döndürmemeli");
    checks.push("Audit advisor: weekly launch metrics are admin-only, bounded to 26 weeks and return counts without personal data");
  } finally { await db.query("reset role"); await db.query("select set_config('request.jwt.claim.sub','',false),set_config('request.jwt.claim.role','',false)"); }

  // 3) Performans: indekssiz FK, yinelenen indeks ve satır başına hesaplanan auth çağrısı kalmamalı.
  //    Korunan eski finans tabloları bilinçli olarak kapsam dışıdır (legacy-preservation sözleşmesi).
  const legacy = "array['orders','order_payments','payouts','disputes','webhook_events']";
  assert.deepEqual((await rows(`select c.conrelid::regclass::text||'.'||c.conname fk from pg_constraint c where c.contype='f' and c.connamespace='public'::regnamespace and (select relname from pg_class where oid=c.conrelid) <> all(${legacy}) and not exists(select 1 from pg_index i where i.indrelid=c.conrelid and i.indpred is null and (i.indkey::int2[])[0:cardinality(c.conkey)-1] operator(pg_catalog.@>) c.conkey) order by 1`)).map(row => row.fk), []);
  assert.deepEqual((await rows("select array_agg(indexrelid::regclass::text order by indexrelid::regclass::text) idx from pg_index i join pg_class c on c.oid=i.indrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' group by indrelid,indkey,indclass,indoption,coalesce(pg_get_expr(indexprs,indrelid),''),coalesce(pg_get_expr(indpred,indrelid),'') having count(*)>1")).map(row => row.idx), []);
  assert.deepEqual((await rows(`select tablename||'.'||policyname policy from pg_policies where schemaname='public' and tablename <> all(${legacy}) and (coalesce(qual,'')||coalesce(with_check,'')) ~ '(?<!SELECT )auth\\.(uid|role|jwt|email)\\(\\)' order by 1`)).map(row => row.policy), []);
  checks.push("Audit advisor: no unindexed foreign key, no duplicate index and no per-row auth call remains in public RLS policies");
}
