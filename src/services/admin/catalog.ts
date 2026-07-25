import { getServerAuthContext } from "@/services/auth/server";
import { hasAdminRole } from "@/services/auth/constants";
import { handleServiceError } from "@/lib/errors";
import { sanitizeText } from "@/lib/validations";
import { isUuid } from "@/lib/utils";
import { writeAuditLog } from "@/services/audit";
import { checkRateLimitWithRedis } from "@/lib/security/rateLimitRedis";
import type { Database } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type AdminSupabaseClient = SupabaseClient<Database>;

export type CatalogItem = {
  id: string;
  isActive: boolean;
  name: string;
  slug: string;
};

export type AdminCatalogData = {
  categories: CatalogItem[];
  districts: CatalogItem[];
  error: string | null;
  isConfigured: boolean;
};

export type CatalogActionResult = { message: string; ok: boolean };

type Gate =
  | { ok: false; supabase: null; userId: null }
  | { ok: true; supabase: AdminSupabaseClient; userId: string };

async function gate(): Promise<Gate & { isConfigured: boolean }> {
  const ctx = await getServerAuthContext();
  if (!ctx.supabase || !ctx.user || !hasAdminRole(ctx.profile)) {
    return { isConfigured: ctx.isConfigured, ok: false, supabase: null, userId: null };
  }
  return { isConfigured: true, ok: true, supabase: ctx.supabase, userId: ctx.user.id };
}

// Türkçe karakterleri sadeleştirip URL-uyumlu slug üretir.
function slugify(value: string): string {
  const map: Record<string, string> = {
    ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u",
    Ç: "c", Ğ: "g", İ: "i", Ö: "o", Ş: "s", Ü: "u",
  };
  return value
    .replace(/[çğıöşüÇĞİÖŞÜ]/g, (ch) => map[ch] ?? ch)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function getAdminCatalog(): Promise<AdminCatalogData> {
  const g = await gate();
  if (!g.ok || !g.supabase) {
    return {
      categories: [],
      districts: [],
      error: g.isConfigured ? "Bu alana erişim yetkin yok." : "Supabase bağlı değil.",
      isConfigured: g.isConfigured,
    };
  }

  try {
    const [categoriesResult, districtsResult] = await Promise.all([
      g.supabase.from("service_categories").select("id, name, slug, is_active").order("name"),
      g.supabase.from("districts").select("id, name, slug, is_active").order("name"),
    ]);

    if (categoriesResult.error || districtsResult.error) {
      return { categories: [], districts: [], error: "Katalog okunamadı.", isConfigured: true };
    }

    const mapItem = (r: {
      id: string;
      is_active: boolean;
      name: string;
      slug: string;
    }): CatalogItem => ({
      id: r.id,
      isActive: r.is_active,
      name: r.name,
      slug: r.slug,
    });

    return {
      categories: (categoriesResult.data ?? []).map(mapItem),
      districts: (districtsResult.data ?? []).map(mapItem),
      error: null,
      isConfigured: true,
    };
  } catch (error) {
    handleServiceError(error, { logContext: "getAdminCatalog" });
    return { categories: [], districts: [], error: "Katalog okunamadı.", isConfigured: true };
  }
}

type CatalogTable = "service_categories" | "districts";

function isCatalogTable(value: string): value is CatalogTable {
  return value === "service_categories" || value === "districts";
}

async function withCatalogGuard(
  table: string,
  action: string,
): Promise<{ g: Extract<Gate, { ok: true }>; table: CatalogTable } | CatalogActionResult> {
  if (!isCatalogTable(table)) {
    return { message: "Geçersiz katalog türü.", ok: false };
  }

  const g = await gate();
  if (!g.ok || !g.supabase) {
    return { message: "Bu işlem için admin yetkisi gerekli.", ok: false };
  }

  const rateLimit = await checkRateLimitWithRedis({
    action: `admin:catalog.${action}`,
    limit: 60,
    supabase: g.supabase,
    userId: g.userId,
    windowMs: 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return { message: "Çok fazla işlem yaptın, biraz bekle.", ok: false };
  }

  return { g, table };
}

async function logCatalog(
  g: Extract<Gate, { ok: true }>,
  table: CatalogTable,
  op: string,
  entityId: string | null,
) {
  await writeAuditLog(
    {
      action: "catalog.updated",
      actorUserId: g.userId,
      entityId,
      entityType: "catalog",
      metadata: { op, table },
    },
    g.supabase,
  );
}

export async function addCatalogItem(
  table: string,
  rawName: string,
): Promise<CatalogActionResult> {
  const name = sanitizeText(rawName, 60);
  if (!name) {
    return { message: "İsim boş olamaz.", ok: false };
  }

  const guard = await withCatalogGuard(table, "add");
  if ("ok" in guard) return guard;
  const { g, table: t } = guard;

  const slug = slugify(name);
  if (!slug) {
    return { message: "Geçerli bir isim gir.", ok: false };
  }

  const { data, error } =
    t === "districts"
      ? await g.supabase
          .from("districts")
          .insert({ name, slug, city: "Istanbul", is_active: true })
          .select("id")
          .maybeSingle()
      : await g.supabase
          .from("service_categories")
          .insert({ name, slug, is_active: true })
          .select("id")
          .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return { message: "Bu isim/slug zaten mevcut.", ok: false };
    }
    handleServiceError(error, { logContext: "addCatalogItem" });
    return { message: "Kayıt eklenemedi.", ok: false };
  }

  await logCatalog(g, t, "add", data?.id ?? null);
  return { message: "Eklendi.", ok: true };
}

export async function setCatalogItemActive(
  table: string,
  id: string,
  isActive: boolean,
): Promise<CatalogActionResult> {
  const cleanId = sanitizeText(id, 80);
  if (!cleanId || !isUuid(cleanId)) {
    return { message: "Geçersiz kayıt.", ok: false };
  }

  const guard = await withCatalogGuard(table, "toggle");
  if ("ok" in guard) return guard;
  const { g, table: t } = guard;

  const { data, error } = await g.supabase
    .from(t)
    .update({ is_active: isActive })
    .eq("id", cleanId)
    .select("id")
    .maybeSingle();

  if (error) {
    handleServiceError(error, { logContext: "setCatalogItemActive" });
    return { message: "Güncellenemedi.", ok: false };
  }
  if (!data) {
    return { message: "Kayıt bulunamadı.", ok: false };
  }

  await logCatalog(g, t, isActive ? "activate" : "deactivate", cleanId);
  return { message: isActive ? "Aktifleştirildi." : "Pasifleştirildi.", ok: true };
}

export async function renameCatalogItem(
  table: string,
  id: string,
  rawName: string,
): Promise<CatalogActionResult> {
  const cleanId = sanitizeText(id, 80);
  const name = sanitizeText(rawName, 60);
  if (!cleanId || !isUuid(cleanId)) {
    return { message: "Geçersiz kayıt.", ok: false };
  }
  if (!name) {
    return { message: "İsim boş olamaz.", ok: false };
  }

  const guard = await withCatalogGuard(table, "rename");
  if ("ok" in guard) return guard;
  const { g, table: t } = guard;

  const { data, error } = await g.supabase
    .from(t)
    .update({ name })
    .eq("id", cleanId)
    .select("id")
    .maybeSingle();

  if (error) {
    handleServiceError(error, { logContext: "renameCatalogItem" });
    return { message: "Güncellenemedi.", ok: false };
  }
  if (!data) {
    return { message: "Kayıt bulunamadı.", ok: false };
  }

  await logCatalog(g, t, "rename", cleanId);
  return { message: "Güncellendi.", ok: true };
}
