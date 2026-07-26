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

type Gate =
  | { isConfigured: boolean; ok: false; supabase: null; userId: null }
  | { isConfigured: true; ok: true; supabase: AdminSupabaseClient; userId: string };

async function gate(): Promise<Gate> {
  const ctx = await getServerAuthContext();
  if (!ctx.supabase || !ctx.user || !hasAdminRole(ctx.profile)) {
    return { isConfigured: ctx.isConfigured, ok: false, supabase: null, userId: null };
  }
  return { isConfigured: true, ok: true, supabase: ctx.supabase, userId: ctx.user.id };
}

export type AdminNotification = {
  body: string;
  createdAt: string;
  id: string;
  isRead: boolean;
  title: string;
};

export type AdminNotificationsData = {
  error: string | null;
  isConfigured: boolean;
  rows: AdminNotification[];
};

export type SendNotificationResult = { message: string; ok: boolean };

export const NOTIFICATION_TARGETS = ["user", "customers", "providers", "all"] as const;
export type NotificationTarget = (typeof NOTIFICATION_TARGETS)[number];

const MAX_RECIPIENTS = 5000;
const CHUNK = 500;

export async function getAdminNotifications(): Promise<AdminNotificationsData> {
  const g = await gate();
  if (!g.ok || !g.supabase) {
    return {
      error: g.isConfigured ? "Bu alana erişim yetkin yok." : "Supabase bağlı değil.",
      isConfigured: g.isConfigured,
      rows: [],
    };
  }

  try {
    const { data, error } = await g.supabase
      .from("notifications")
      .select("id, title, body, is_read, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      handleServiceError(error, { logContext: "getAdminNotifications" });
      return { error: "Bildirimler okunamadı.", isConfigured: true, rows: [] };
    }

    const rows: AdminNotification[] = ((data ?? []) as unknown as Array<{
      body: string;
      created_at: string;
      id: string;
      is_read: boolean;
      title: string;
    }>).map((raw) => ({
      body: raw.body,
      createdAt: raw.created_at,
      id: raw.id,
      isRead: raw.is_read,
      title: raw.title,
    }));

    return { error: null, isConfigured: true, rows };
  } catch (error) {
    handleServiceError(error, { logContext: "getAdminNotifications" });
    return { error: "Bildirimler okunamadı.", isConfigured: true, rows: [] };
  }
}

function isTarget(value: string): value is NotificationTarget {
  return (NOTIFICATION_TARGETS as readonly string[]).includes(value);
}

export async function sendAdminNotification(input: {
  body: string;
  target: string;
  title: string;
  userId?: string;
}): Promise<SendNotificationResult> {
  const title = sanitizeText(input.title, 120);
  const body = sanitizeText(input.body, 1000);

  if (!title) return { message: "Başlık boş olamaz.", ok: false };
  if (!body) return { message: "Mesaj boş olamaz.", ok: false };
  if (!isTarget(input.target)) return { message: "Geçersiz hedef.", ok: false };

  const g = await gate();
  if (!g.ok || !g.supabase) {
    return { message: "Bu işlem için admin yetkisi gerekli.", ok: false };
  }

  const rateLimit = await checkRateLimitWithRedis({
    action: "admin:notification.send",
    limit: 30,
    supabase: g.supabase,
    userId: g.userId,
    windowMs: 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return { message: "Çok fazla gönderim yaptın, biraz bekle.", ok: false };
  }

  // Alıcı id listesini belirle.
  let recipientIds: string[] = [];

  if (input.target === "user") {
    const userId = sanitizeText(input.userId ?? "", 80);
    if (!userId || !isUuid(userId)) {
      return { message: "Geçerli bir kullanıcı seç.", ok: false };
    }
    recipientIds = [userId];
  } else {
    let query = g.supabase
      .from("profiles")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(MAX_RECIPIENTS);
    if (input.target === "customers") query = query.eq("role", "customer");
    else if (input.target === "providers") query = query.eq("role", "provider");

    const { data, error } = await query;
    if (error) {
      handleServiceError(error, { logContext: "sendAdminNotification:recipients" });
      return { message: "Alıcılar belirlenemedi.", ok: false };
    }
    recipientIds = (data ?? []).map((row) => row.id);
  }

  if (recipientIds.length === 0) {
    return { message: "Hedef kitlede alıcı bulunamadı.", ok: false };
  }

  const truncated = input.target !== "user" && recipientIds.length >= MAX_RECIPIENTS;

  const buildRow = (recipientId: string) => ({
    user_id: recipientId,
    recipient_user_id: recipientId,
    actor_user_id: g.userId,
    entity_type: "service_request" as const,
    entity_id: null,
    type: "admin_announcement",
    event: "admin.announcement",
    title,
    body,
    message: body,
    is_read: false,
  });

  let sent = 0;
  let partialFailure = false;
  for (let i = 0; i < recipientIds.length; i += CHUNK) {
    const chunk = recipientIds.slice(i, i + CHUNK).map(buildRow);
    const { error } = await g.supabase.from("notifications").insert(chunk);
    if (error) {
      handleServiceError(error, { logContext: "sendAdminNotification:insert" });
      if (sent === 0) {
        return { message: "Bildirim gönderilemedi.", ok: false };
      }
      partialFailure = true;
      break;
    }
    sent += chunk.length;
  }

  await writeAuditLog(
    {
      action: "notification.sent",
      actorUserId: g.userId,
      entityId: null,
      entityType: "notification",
      metadata: { count: sent, partialFailure, target: input.target, title, truncated },
    },
    g.supabase,
  );

  if (partialFailure) {
    return {
      message: `Kısmi gönderim: ${sent} kişiye ulaşıldı, kalanlar gönderilemedi. Tekrar dene.`,
      ok: false,
    };
  }

  if (truncated) {
    return {
      message: `İlk ${sent} kişiye gönderildi (hedef kitle ${MAX_RECIPIENTS} sınırını aştı).`,
      ok: true,
    };
  }

  return { message: `${sent} kişiye bildirim gönderildi.`, ok: true };
}
