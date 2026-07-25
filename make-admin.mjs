// Fuwu: bir kullaniciyi admin yapar. supabase-js / WebSocket gerektirmez.
// Kullanim:  node make-admin.mjs eposta@ornek.com
import { existsSync, readFileSync } from "node:fs";

function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    if (process.env[k]) continue;
    process.env[k] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
}

loadEnv(".env.local");
loadEnv(".env");

const email = (process.argv[2] || process.env.ADMIN_SEED_EMAIL || "").trim().toLowerCase();
const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

if (!email) { console.error("HATA: e-posta ver. Ornek: node make-admin.mjs alidgn0830@gmail.com"); process.exit(1); }
if (!url || !key) { console.error("HATA: .env.local icinde NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY dolu olmali."); process.exit(1); }

const authHeaders = { apikey: key, Authorization: `Bearer ${key}` };

async function findUser(target) {
  for (let page = 1; page <= 100; page++) {
    const res = await fetch(`${url}/auth/v1/admin/users?page=${page}&per_page=100`, { headers: authHeaders });
    if (!res.ok) throw new Error(`Auth listesi alinamadi (${res.status}): ${await res.text()}`);
    const body = await res.json();
    const users = Array.isArray(body) ? body : body.users || [];
    const match = users.find((u) => (u.email || "").toLowerCase() === target);
    if (match) return match;
    if (users.length < 100) return null;
  }
  return null;
}

const user = await findUser(email);
if (!user) {
  console.error(`YOK: ${email} icin kullanici bulunamadi. Once uygulamada bu e-posta ile giris yap, sonra tekrar calistir.`);
  process.exit(2);
}
console.log(`Bulundu: ${email} -> id ${user.id}`);

// profiles.role = admin  (service key RLS'i bypass eder)
const patch = await fetch(`${url}/rest/v1/profiles?id=eq.${user.id}`, {
  method: "PATCH",
  headers: { ...authHeaders, "Content-Type": "application/json", Prefer: "return=representation" },
  body: JSON.stringify({ role: "admin" }),
});
if (!patch.ok) { console.error(`Profil guncellenemedi (${patch.status}): ${await patch.text()}`); process.exit(1); }
let rows = await patch.json();

// profil satiri henuz yoksa olustur
if (!Array.isArray(rows) || rows.length === 0) {
  const ins = await fetch(`${url}/rest/v1/profiles`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ id: user.id, role: "admin" }),
  });
  if (!ins.ok) { console.error(`Profil olusturulamadi (${ins.status}): ${await ins.text()}`); process.exit(1); }
  rows = await ins.json();
}

const role = Array.isArray(rows) && rows[0] ? rows[0].role : "admin";
console.log(`BASARILI: ${email} artik '${role}'. Uygulamada /admin sayfasini yenile.`);
