import { getServerAuthContext } from "@/services/auth/server";
import { hasAdminRole } from "@/services/auth/constants";
import { writeAuditLog } from "@/services/audit";
import { handleServiceError } from "@/lib/errors";
import { sanitizeText } from "@/lib/validations";
import { isUuid } from "@/lib/utils";
import { checkRateLimitWithRedis } from "@/lib/security/rateLimitRedis";

export const SUPPORT_STATUSES = ["new", "read", "resolved"] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

export const SUPPORT_STATUS_LABELS: Record<SupportStatus, string> = {
  new: "Yeni",
  read: "İnceleniyor",
  resolved: "Çözüldü",
};

export type AdminSupportMessage = {
  adminNote: string | null;
  createdAt: string;
  email: string;
  id: string;
  message: string;
  resolvedAt: string | null;
  status: SupportStatus;
  subject: string;
  userId: string | null;
};

export type AdminSupportInbox = {
  counts: Record<SupportStatus, number>;
  error: string | null;
  page: number;
  pageSize: number;
  rows: AdminSupportMessage[];
  total: number;
};

type SupportRow = {
  admin_note?: string | null;
  created_at: string;
  email: string;
  id: string;
  message: string;
  resolved_at?: string | null;
  status: string;
  subject: string;
  user_id: string | null;
};

// support_messages is not part of the generated Database types, so the client is narrowed locally.
type QueryResult<T> = Promise<{ count?: number | null; data: T | null; error: unknown }>;
type SupportQuery = {
  eq: (column: string, value: string) => SupportQuery;
  order: (column: string, options: { ascending: boolean }) => SupportQuery;
  range: (from: number, to: number) => QueryResult<SupportRow[]>;
  select: (columns: string, options?: { count?: "exact"; head?: boolean }) => SupportQuery;
  then: QueryResult<SupportRow[]>["then"];
};
type SupportUpdate = {
  eq: (column: string, value: string) => { select: (columns: string) => { maybeSingle: () => QueryResult<{ id: string }> } };
};
type SupportClient = {
  from: (table: "support_messages") => {
    select: SupportQuery["select"];
    update: (value: Record<string, unknown>) => SupportUpdate;
  };
};

export const SUPPORT_PAGE_SIZE = 20;

function normalizeStatus(value: string | null | undefined): SupportStatus {
  return SUPPORT_STATUSES.includes(value as SupportStatus) ? (value as SupportStatus) : "new";
}

async function adminSupportClient() {
  const ctx = await getServerAuthContext();
  if (!ctx.supabase || !ctx.user || !hasAdminRole(ctx.profile)) return null;
  return { client: ctx.supabase as unknown as SupportClient, raw: ctx.supabase, userId: ctx.user.id };
}

async function countByStatus(client: SupportClient, status: SupportStatus) {
  const { count, error } = await client.from("support_messages").select("id", { count: "exact", head: true }).eq("status", status);
  if (error) throw error;
  return count ?? 0;
}

export async function getAdminSupportInbox(options: { page?: number; status?: string | null } = {}): Promise<AdminSupportInbox> {
  const page = Math.max(1, Math.floor(Number(options.page) || 1));
  const filter = options.status && SUPPORT_STATUSES.includes(options.status as SupportStatus) ? (options.status as SupportStatus) : null;
  const empty: AdminSupportInbox = { counts: { new: 0, read: 0, resolved: 0 }, error: null, page, pageSize: SUPPORT_PAGE_SIZE, rows: [], total: 0 };

  const gate = await adminSupportClient();
  if (!gate) return { ...empty, error: "Bu alan için admin yetkisi gerekli." };

  try {
    let query = gate.client
      .from("support_messages")
      .select("id,subject,email,message,status,user_id,created_at,admin_note,resolved_at", { count: "exact" });
    if (filter) query = query.eq("status", filter);
    const from = (page - 1) * SUPPORT_PAGE_SIZE;
    const [list, newCount, readCount, resolvedCount] = await Promise.all([
      query.order("created_at", { ascending: false }).range(from, from + SUPPORT_PAGE_SIZE - 1),
      countByStatus(gate.client, "new"),
      countByStatus(gate.client, "read"),
      countByStatus(gate.client, "resolved"),
    ]);
    if (list.error) throw list.error;

    return {
      counts: { new: newCount, read: readCount, resolved: resolvedCount },
      error: null,
      page,
      pageSize: SUPPORT_PAGE_SIZE,
      rows: (list.data ?? []).map(row => ({
        adminNote: row.admin_note ?? null,
        createdAt: row.created_at,
        email: row.email,
        id: row.id,
        message: row.message,
        resolvedAt: row.resolved_at ?? null,
        status: normalizeStatus(row.status),
        subject: row.subject,
        userId: row.user_id,
      })),
      total: list.count ?? 0,
    };
  } catch (error) {
    handleServiceError(error, { logContext: "getAdminSupportInbox" });
    return { ...empty, error: "Destek mesajları okunamadı. Migration uygulanmış mı kontrol et." };
  }
}

export async function getNewSupportMessageCount(): Promise<number | null> {
  const gate = await adminSupportClient();
  if (!gate) return null;
  try {
    return await countByStatus(gate.client, "new");
  } catch {
    return null;
  }
}

export async function updateSupportMessage(input: { id: string; note?: string | null; status: string }): Promise<{ message: string; ok: boolean }> {
  const id = sanitizeText(input.id, 80);
  if (!id || !isUuid(id)) return { message: "Geçersiz mesaj kimliği.", ok: false };
  if (!SUPPORT_STATUSES.includes(input.status as SupportStatus)) return { message: "Geçersiz durum.", ok: false };

  const gate = await adminSupportClient();
  if (!gate) return { message: "Bu işlem için admin yetkisi gerekli.", ok: false };

  const rateLimit = await checkRateLimitWithRedis({
    action: "admin:support.update",
    limit: 120,
    supabase: gate.raw,
    userId: gate.userId,
    windowMs: 60 * 1000,
  });
  if (!rateLimit.allowed) return { message: "Çok fazla işlem yaptın, biraz bekle.", ok: false };

  const patch: Record<string, unknown> = { handled_by: gate.userId, status: input.status };
  if (input.note !== undefined) patch.admin_note = sanitizeText(input.note ?? "", 2000) || null;

  const { data, error } = await gate.client.from("support_messages").update(patch).eq("id", id).select("id").maybeSingle();
  if (error) {
    handleServiceError(error, { logContext: "updateSupportMessage" });
    return { message: "Mesaj güncellenemedi.", ok: false };
  }
  if (!data) return { message: "Mesaj bulunamadı.", ok: false };

  await writeAuditLog(
    { action: "support_message.updated", actorUserId: gate.userId, entityId: id, entityType: "support_message", metadata: { status: input.status, noteChanged: input.note !== undefined } },
    gate.raw,
  );
  return { message: input.status === "resolved" ? "Mesaj çözüldü olarak işaretlendi." : "Mesaj güncellendi.", ok: true };
}
