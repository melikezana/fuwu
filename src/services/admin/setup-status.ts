import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { isRealPublishedProvider } from "@/lib/providers/provenance";

/**
 * Açılış kurulum durumu. Yalnızca admin görür; hiçbir gizli değer döndürmez,
 * yalnızca "tanımlı mı / çalışıyor mu" bilgisini ve yapılacak işi söyler.
 */
export type SetupStatus = "ok" | "warn" | "fail" | "info" | "manual";
export type SetupGroup = "altyapi" | "giris" | "veritabani" | "icerik";
export type SetupCheck = { id: string; group: SetupGroup; title: string; status: SetupStatus; detail: string; action?: string; href?: string };

type Env = Record<string, string | undefined>;
const has = (env: Env, ...names: string[]) => names.every(name => Boolean(env[name]?.trim()));
const missing = (env: Env, names: string[]) => names.filter(name => !env[name]?.trim());

export function environmentChecks(env: Env): SetupCheck[] {
  const checks: SetupCheck[] = [];
  const add = (check: Omit<SetupCheck, "group">) => checks.push({ group: "altyapi", ...check });

  add(has(env, "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY")
    ? { id: "supabase", title: "Veritabanı bağlantısı", status: "ok", detail: "Site Supabase'e bağlı." }
    : { id: "supabase", title: "Veritabanı bağlantısı", status: "fail", detail: "Site veritabanına bağlanamıyor.", action: "Vercel'e NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY ekle." });

  add(has(env, "SUPABASE_SERVICE_ROLE_KEY")
    ? { id: "service-role", title: "Sunucu anahtarı", status: "ok", detail: "Ödeme dönüşü, zamanlanmış işler ve yönetim işlemleri çalışır." }
    : { id: "service-role", title: "Sunucu anahtarı", status: "fail", detail: "Ödeme dönüşü, zamanlanmış işler ve yönetim işlemleri çalışmaz.", action: "Vercel'e SUPABASE_SERVICE_ROLE_KEY ekle (yalnızca sunucu)." });

  add(/^https:\/\//.test(env.NEXT_PUBLIC_SITE_URL ?? "")
    ? { id: "site-url", title: "Site adresi", status: "ok", detail: "Ödeme ve giriş dönüşleri doğru adrese gider." }
    : { id: "site-url", title: "Site adresi", status: "warn", detail: "Ödeme ve giriş dönüşleri yanlış adrese gidebilir.", action: "Vercel'e NEXT_PUBLIC_SITE_URL=https://www.fuwu.com.tr ekle." });

  const cron = env.CRON_SECRET?.trim() ?? "";
  add(cron.length >= 32
    ? { id: "cron", title: "Zamanlanmış işler", status: "ok", detail: "Süresi dolan rezervasyonlar her gece temizlenir." }
    : cron
      ? { id: "cron", title: "Zamanlanmış işler", status: "warn", detail: "CRON_SECRET kısa; tahmin edilmesi kolaylaşır.", action: "En az 32 rastgele karakterlik yeni bir CRON_SECRET tanımla." }
      : { id: "cron", title: "Zamanlanmış işler", status: "fail", detail: "Gece temizliği ve sistem kontrolleri çalışmaz.", action: "Vercel'e en az 32 karakterlik CRON_SECRET ekle." });

  add(has(env, "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN")
    ? { id: "rate-limit", title: "Saldırı ve hız sınırı", status: "ok", detail: "Hız sınırları kalıcı ve tüm sunucularda ortak." }
    : { id: "rate-limit", title: "Saldırı ve hız sınırı", status: "warn", detail: "Hız sınırı yalnızca tek sunucunun belleğinde tutuluyor; yoğun saldırıda zayıf kalır.", action: "Upstash Redis aç; UPSTASH_REDIS_REST_URL ve UPSTASH_REDIS_REST_TOKEN ekle." });

  add(has(env, "NEXT_PUBLIC_SENTRY_DSN")
    ? { id: "monitoring", title: "Hata izleme", status: "ok", detail: "Sitede oluşan hatalar Sentry'ye kaydedilir." }
    : { id: "monitoring", title: "Hata izleme", status: "warn", detail: "Hatalar kaydedilmiyor; sorunları kullanıcı söyleyene kadar göremezsin.", action: "Sentry projesi aç, NEXT_PUBLIC_SENTRY_DSN ekle." });

  const smsNames = ["NETGSM_USERCODE", "NETGSM_PASSWORD", "NETGSM_HEADER", "SUPABASE_SEND_SMS_HOOK_SECRET"];
  const smsMissing = [...((env.SMS_PROVIDER ?? "").trim().toLowerCase() === "netgsm" ? [] : ["SMS_PROVIDER=netgsm"]), ...missing(env, smsNames)];
  add(smsMissing.length === 0
    ? { id: "sms", title: "SMS (NetGSM)", status: "ok", detail: "Doğrulama kodları ve ustaya yeni randevu SMS'i NetGSM ile gider." }
    : { id: "sms", title: "SMS (NetGSM)", status: "fail", detail: `Ustalar telefonunu doğrulayamaz, SMS ile giriş ve randevu SMS'i çalışmaz. Eksik: ${smsMissing.join(", ")}.`, action: "docs/sms-netgsm-kurulum.md adımlarını uygula." });

  const sandbox = /sandbox/i.test(env.IYZICO_BASE_URL ?? "https://sandbox-api.iyzipay.com");
  add(has(env, "IYZICO_API_KEY", "IYZICO_SECRET_KEY")
    ? { id: "payment", title: "Ödeme (iyzico)", status: sandbox ? "ok" : "warn", detail: sandbox ? "iyzico test ortamı bağlı." : "iyzico adresi test ortamı değil; site yalnızca test ödemesine izin verir." }
    : { id: "payment", title: "Ödeme (iyzico)", status: "fail", detail: "Ödeme sayfası açılamaz.", action: "Vercel'e IYZICO_API_KEY ve IYZICO_SECRET_KEY ekle." });

  add(env.FUWU_SANDBOX_CHECKOUT_ENABLED === "true"
    ? { id: "checkout", title: "Online satın alma", status: "info", detail: "Açık (test ödemesi). Gerçek para tahsil edilmez." }
    : { id: "checkout", title: "Online satın alma", status: "info", detail: "Kapalı (açılış öncesi). Müşteriler hizmetleri görür, satın alamaz.", action: "Ustalar yayına alındığında FUWU_SANDBOX_CHECKOUT_ENABLED=true ile test satışı aç." });

  add({ id: "live-payment", title: "Gerçek ödeme", status: "info", detail: "Gerçek para tahsilatı için iyzico pazaryeri sözleşmesi, alt üye işyeri onayı ve canlı anahtarlar gerekir. Şu an yalnızca test ödemesi var." });

  add(has(env, "OPENAI_API_KEY")
    ? { id: "ai", title: "Yapay zekâ destek asistanı", status: "ok", detail: "Açık." }
    : { id: "ai", title: "Yapay zekâ destek asistanı", status: "info", detail: "Kapalı. İsteğe bağlı.", action: "Kullanmak istersen OPENAI_API_KEY ekle." });

  add(has(env, "NEXT_PUBLIC_GA_MEASUREMENT_ID") || has(env, "NEXT_PUBLIC_META_PIXEL_ID")
    ? { id: "analytics", title: "Ziyaretçi ölçümü", status: "ok", detail: "Analitik etiketi tanımlı." }
    : { id: "analytics", title: "Ziyaretçi ölçümü", status: "info", detail: "Tanımlı değil; reklam ve trafik etkisini ölçemezsin. İsteğe bağlı." });

  return checks;
}

type AuthSettings = { external?: Record<string, boolean | undefined> } | null;

export function authChecks(settings: AuthSettings, dashboardUrl: string | null): SetupCheck[] {
  const checks: SetupCheck[] = [];
  const add = (check: Omit<SetupCheck, "group">) => checks.push({ group: "giris", ...check });
  const external = settings?.external;
  if (!external) {
    add({ id: "auth-settings", title: "Giriş ayarları", status: "warn", detail: "Supabase giriş ayarları şu anda okunamadı.", action: "Birazdan sayfayı yenile." });
  } else {
    add(external.google ? { id: "google", title: "Google ile giriş", status: "ok", detail: "Açık." } : { id: "google", title: "Google ile giriş", status: "warn", detail: "Kapalı.", action: "Supabase › Authentication › Sign In / Providers › Google'ı aç." });
    add(external.email ? { id: "email", title: "E-posta kodu ile giriş", status: "ok", detail: "Açık." } : { id: "email", title: "E-posta kodu ile giriş", status: "warn", detail: "Kapalı.", action: "Supabase › Authentication › Sign In / Providers › Email'i aç." });
    add(external.phone ? { id: "phone", title: "Telefon ile giriş ve doğrulama", status: "ok", detail: "Açık." } : { id: "phone", title: "Telefon ile giriş ve doğrulama", status: "fail", detail: "Kapalı: ustalar telefonunu doğrulayamaz, başvuru yapamaz.", action: "Supabase › Authentication › Sign In / Providers › Phone'u aç." });
    add(external.anonymous_users ? { id: "anonymous", title: "Anonim giriş", status: "warn", detail: "Açık. Anonim hesaplar sipariş açamaz ama kapalı tutulması daha güvenli.", action: "Supabase › Authentication › Sign In / Providers › Anonymous'u kapat." } : { id: "anonymous", title: "Anonim giriş", status: "ok", detail: "Kapalı." });
  }
  const panel = dashboardUrl ? { href: dashboardUrl } : {};
  add({ id: "sms-hook", title: "SMS kancası (Send SMS)", status: "manual", detail: "Panelden okunamıyor. Kodların NetGSM ile gitmesi için açık olmalı.", action: "Supabase › Authentication › Hooks › Send SMS: https://www.fuwu.com.tr/api/auth/sms-hook", ...panel });
  add({ id: "signup-hook", title: "Yurt dışı numara engeli (Before User Created)", status: "manual", detail: "Panelden okunamıyor.", action: "Supabase › Authentication › Hooks › Before User Created: public.hook_fuwu_before_user_created", ...panel });
  add({ id: "captcha", title: "Bot koruması (Turnstile)", status: "manual", detail: "Panelden okunamıyor. Kod isteklerini botlara kapatır.", action: "Supabase › Authentication › Attack Protection › Cloudflare Turnstile", ...panel });
  add({ id: "admin-2fa", title: "Admin hesabında iki adımlı doğrulama", status: "manual", detail: "Admin olarak giriş yaptığın Google hesabında 2 adımlı doğrulama açık olmalı." });
  return checks;
}

const countOf = (result: { count: number | null; error: unknown }) => (result.error ? null : result.count ?? 0);

export async function contentChecks(db: SupabaseClient<Database>): Promise<SetupCheck[]> {
  const checks: SetupCheck[] = [];
  const add = (group: SetupGroup, check: Omit<SetupCheck, "group">) => checks.push({ group, ...check });
  const zero = "00000000-0000-0000-0000-000000000000";

  const [trust, dispatches, publication, categories, services, offers, applications, documents, draftRules] = await Promise.all([
    db.rpc("commerce_order_trust", { p_order_id: zero }),
    db.from("order_sms_dispatches").select("order_id", { head: true, count: "exact" }),
    db.rpc("provider_publication_gate", {}),
    db.from("service_categories").select("id,name,is_visible").eq("is_active", true),
    db.from("service_catalog").select("id,category_id").eq("is_active", true),
    db.rpc("commerce_offers", {}),
    db.from("provider_applications").select("id", { head: true, count: "exact" }).eq("status", "pending"),
    db.from("provider_document_versions").select("id", { head: true, count: "exact" }).in("status", ["uploaded", "in_review"]).is("superseded_at", null),
    db.from("provider_document_rules").select("id", { head: true, count: "exact" }).eq("legal_status", "draft"),
  ]);

  // Son migration'lar: fonksiyon/tablo yoksa PostgREST "bulunamadı" (PGRST2xx) döner; yetki hatası ise var demektir.
  const missingObject = (error: { code?: string } | null) => Boolean(error && (error.code?.startsWith("PGRST2") || error.code === "42P01" || error.code === "42883"));
  add("veritabani", missingObject(trust.error) || missingObject(dispatches.error)
    ? { id: "migrations", title: "Veritabanı güncelliği", status: "fail", detail: "Son migration'lar canlı veritabanına uygulanmamış.", action: "Bilgisayarında: npx supabase@2.115.0 db push --include-all" }
    : { id: "migrations", title: "Veritabanı güncelliği", status: "ok", detail: "Karşılıklı doğrulama ve randevu SMS'i için gereken son değişiklikler uygulanmış." });

  const published = Array.isArray(publication.data) ? (publication.data as { id: string; record_kind?: string }[]).filter(isRealPublishedProvider).length : null;
  add("icerik", published === null
    ? { id: "published", title: "Yayındaki ustalar", status: "warn", detail: "Usta yayın durumu okunamadı." }
    : published === 0
      ? { id: "published", title: "Yayındaki ustalar", status: "fail", detail: "Yayında usta yok; müşteriler hizmet satın alamaz.", action: "Başvuruları incele, belgeleri onayla ve ustaları yayına al.", href: "/admin/provider-applications" }
      : { id: "published", title: "Yayındaki ustalar", status: "ok", detail: `${published} usta yayında.` });

  const visibleCategories = (categories.data ?? []).filter(category => category.is_visible !== false);
  const activeServices = services.data ?? [];
  const emptyCategories = visibleCategories.filter(category => !activeServices.some(service => service.category_id === category.id));
  add("icerik", categories.error || services.error
    ? { id: "catalog", title: "Hizmet kataloğu", status: "warn", detail: "Katalog okunamadı." }
    : emptyCategories.length
      ? { id: "catalog", title: "Hizmet kataloğu", status: "warn", detail: `${visibleCategories.length} kategoriden ${emptyCategories.length} tanesinde hizmet yok: ${emptyCategories.slice(0, 6).map(category => category.name).join(", ")}${emptyCategories.length > 6 ? "…" : ""}. Müşteri bu kategorilerde boş sayfa görür.`, action: "Bu kategorilere hizmet ekle ya da kategoriyi gizle.", href: "/admin/catalog" }
      : { id: "catalog", title: "Hizmet kataloğu", status: "ok", detail: `${visibleCategories.length} kategorinin hepsinde hizmet var.` });

  const offeredServices = new Set(Array.isArray(offers.data) ? (offers.data as { service_id?: string }[]).map(offer => offer.service_id) : []);
  const sellable = activeServices.filter(service => offeredServices.has(service.id)).length;
  add("icerik", offers.error
    ? { id: "sellable", title: "Satışa hazır hizmetler", status: "warn", detail: "Usta teklifleri okunamadı." }
    : sellable === 0
      ? { id: "sellable", title: "Satışa hazır hizmetler", status: "fail", detail: `${activeServices.length} hizmetin hiçbirinde yayında usta teklifi yok.`, action: "Ustalar Hizmet Mağazam'dan fiyat ve bölge girmeli; ardından yayına al.", href: "/admin/providers" }
      : { id: "sellable", title: "Satışa hazır hizmetler", status: sellable < activeServices.length ? "warn" : "ok", detail: `${activeServices.length} hizmetten ${sellable} tanesinde yayında usta var.` });

  const pending = countOf(applications);
  add("icerik", pending === null
    ? { id: "applications", title: "Bekleyen usta başvuruları", status: "warn", detail: "Başvurular okunamadı." }
    : pending > 0
      ? { id: "applications", title: "Bekleyen usta başvuruları", status: "warn", detail: `${pending} başvuru inceleme bekliyor.`, action: "Başvuruları incele.", href: "/admin/provider-applications" }
      : { id: "applications", title: "Bekleyen usta başvuruları", status: "ok", detail: "Bekleyen başvuru yok." });

  const reviewDocs = countOf(documents);
  add("icerik", reviewDocs === null
    ? { id: "documents", title: "İnceleme bekleyen belgeler", status: "warn", detail: "Belgeler okunamadı." }
    : reviewDocs > 0
      ? { id: "documents", title: "İnceleme bekleyen belgeler", status: "warn", detail: `${reviewDocs} belge inceleme bekliyor.`, action: "Belgeleri güvenli alanda incele.", href: "/admin/verifications" }
      : { id: "documents", title: "İnceleme bekleyen belgeler", status: "ok", detail: "Bekleyen belge yok." });

  const drafts = countOf(draftRules);
  if (drafts) add("icerik", { id: "rules", title: "Taslak belge kuralları", status: "info", detail: `${drafts} kural taslakta (kimlik, adli sicil). Onaylanmadan zorunlu olmaz.`, action: "KVKK açık rıza metnini güncelledikten sonra onayla.", href: "/admin/verifications" });

  return checks;
}

export function supabaseDashboardUrl(env: Env) {
  const ref = (env.NEXT_PUBLIC_SUPABASE_URL ?? "").match(/^https:\/\/([a-z0-9]{20})\.supabase\.co/)?.[1];
  return ref ? `https://supabase.com/dashboard/project/${ref}` : null;
}

export async function readAuthSettings(env: Env): Promise<AuthSettings> {
  const url = env.NEXT_PUBLIC_SUPABASE_URL, key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/settings`, { headers: { apikey: key }, cache: "no-store", signal: AbortSignal.timeout(3000) });
    return response.ok ? (await response.json()) as AuthSettings : null;
  } catch {
    return null;
  }
}
