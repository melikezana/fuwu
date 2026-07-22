import { getServerAuthContext } from "@/services/auth/server";
import { hasAdminRole } from "@/services/auth/constants";
import { handleServiceError } from "@/lib/errors";
import { writeAuditLog } from "@/services/audit";
import { checkRateLimitWithRedis } from "@/lib/security/rateLimitRedis";
import { sanitizeText } from "@/lib/validations";
import { isUuid } from "@/lib/utils";
import type { ProfileRole } from "@/types/auth";
import type { Database } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type AdminSupabaseClient = SupabaseClient<Database>;

export type AdminUser = {
  createdAt: string;
  fullName: string | null;
  id: string;
  phone: string | null;
  role: ProfileRole;
};

export type AdminUsersResult = {
  error: string | null;
  isConfigured: boolean;
  rows: AdminUser[];
};

export type UpdateUserRoleResult = {
  message: string;
  ok: boolean;
};

const assignableRoles: ProfileRole[] = ["customer", "provider", "admin"];

export function isAssignableRole(value: string): value is ProfileRole {
  return (assignableRoles as string[]).includes(value);
}

type AdminContext =
  | { isConfigured: boolean; ok: false; supabase: null; userId: string | null }
  | { isConfigured: true; ok: true; supabase: AdminSupabaseClient; userId: string };

// Admin oturumunu ve rolünü tek yerde doğrular. Tüm işlemler bundan geçer.
async function getAdminContext(): Promise<AdminContext> {
  const ctx = await getServerAuthContext();

  if (!ctx.supabase || !ctx.user) {
    return { isConfigured: ctx.isConfigured, ok: false, supabase: null, userId: null };
  }

  if (!hasAdminRole(ctx.profile)) {
    return { isConfigured: true, ok: false, supabase: null, userId: ctx.user.id };
  }

  return { isConfigured: true, ok: true, supabase: ctx.supabase, userId: ctx.user.id };
}

// PostgREST .or() filtresini bozacak/enjeksiyona açık karakterleri temizler.
function sanitizeSearchTerm(raw: string): string {
  return raw.replace(/[,()%*\\]/g, " ").trim();
}

export async function getAdminUsers(params?: {
  role?: string;
  search?: string;
}): Promise<AdminUsersResult> {
  const ctx = await getAdminContext();

  if (!ctx.ok || !ctx.supabase) {
    return {
      error: ctx.isConfigured
        ? "Bu alana erişim yetkin yok."
        : "Supabase bağlantısı yapılandırılmadı.",
      isConfigured: ctx.isConfigured,
      rows: [],
    };
  }

  try {
    let query = ctx.supabase
      .from("profiles")
      .select("id, full_name, phone, role, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    const roleFilter = params?.role ? sanitizeText(params.role, 20) : "";
    if (roleFilter && isAssignableRole(roleFilter)) {
      query = query.eq("role", roleFilter);
    }

    const search = params?.search ? sanitizeSearchTerm(sanitizeText(params.search, 80)) : "";
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      handleServiceError(error, { logContext: "getAdminUsers" });
      return { error: "Kullanıcılar okunamadı.", isConfigured: true, rows: [] };
    }

    const rows: AdminUser[] = (data ?? []).map((profile) => ({
      createdAt: profile.created_at,
      fullName: profile.full_name,
      id: profile.id,
      phone: profile.phone,
      role: profile.role as ProfileRole,
    }));

    return { error: null, isConfigured: true, rows };
  } catch (error) {
    handleServiceError(error, { logContext: "getAdminUsers" });
    return { error: "Kullanıcılar okunamadı.", isConfigured: true, rows: [] };
  }
}

export async function updateAdminUserRole(
  userId: string,
  nextRole: string,
): Promise<UpdateUserRoleResult> {
  const id = sanitizeText(userId, 80);
  const role = sanitizeText(nextRole, 20);

  if (!id || !isUuid(id)) {
    return { message: "Geçersiz kullanıcı kimliği.", ok: false };
  }

  if (!isAssignableRole(role)) {
    return { message: "Geçersiz rol.", ok: false };
  }

  const ctx = await getAdminContext();

  if (!ctx.ok || !ctx.supabase) {
    // Yetkisiz deneme: güvenlik olayı olarak kaydet.
    if (ctx.userId) {
      await writeAuditLog({
        action: "security.unauthorized_action",
        actorUserId: ctx.userId,
        entityId: id,
        entityType: "security_event",
        metadata: { scope: "user.role_update" },
      });
    }
    return { message: "Bu işlem için admin yetkisi gerekli.", ok: false };
  }

  // Güvenlik: admin kendi rolünü değiştiremez (kendini kilitlemeyi önler).
  if (ctx.userId === id) {
    return { message: "Kendi rolünü buradan değiştiremezsin.", ok: false };
  }

  const rateLimit = await checkRateLimitWithRedis({
    action: "admin:user.role_update",
    limit: 60,
    supabase: ctx.supabase,
    userId: ctx.userId,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return { message: "Çok fazla işlem yaptın, biraz bekleyip tekrar dene.", ok: false };
  }

  const { data, error } = await ctx.supabase
    .from("profiles")
    .update({ role })
    .eq("id", id)
    .select("id, role")
    .maybeSingle();

  if (error) {
    await writeAuditLog(
      {
        action: "admin.action_failed",
        actorUserId: ctx.userId,
        entityId: id,
        entityType: "profile",
        metadata: { error: error.message, role, scope: "user.role_update" },
      },
      ctx.supabase,
    );
    return { message: "Rol güncellenemedi. Lütfen tekrar dene.", ok: false };
  }

  if (!data) {
    return { message: "Kullanıcı bulunamadı.", ok: false };
  }

  await writeAuditLog(
    {
      action: "user.role_updated",
      actorUserId: ctx.userId,
      entityId: id,
      entityType: "profile",
      metadata: { role },
    },
    ctx.supabase,
  );

  return { message: "Rol başarıyla güncellendi.", ok: true };
}
