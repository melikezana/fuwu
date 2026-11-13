"use server";
import { revalidatePath } from "next/cache";
import { getServerAuthContext } from "@/services/auth/server";
import { markAllNotificationsAsRead, markNotificationAsRead } from "@/services/notifications";
import { isUuid } from "@/lib/utils/validation";

// Bildirimi okundu işaretler. Satırı yalnızca sahibi değiştirebilir (RLS + recipient_user_id süzgeci).
function refresh() {
  revalidatePath("/account/notifications");
  revalidatePath("/provider-dashboard/notifications");
}

export async function markNotificationReadAction(notificationId: string) {
  if (!isUuid(notificationId)) return { ok: false };
  const { supabase, user } = await getServerAuthContext();
  if (!supabase || !user) return { ok: false };
  const ok = await markNotificationAsRead(notificationId, user.id, supabase);
  if (ok) refresh();
  return { ok };
}

export async function markAllNotificationsReadAction() {
  const { supabase, user } = await getServerAuthContext();
  if (!supabase || !user) return { ok: false };
  const ok = await markAllNotificationsAsRead(user.id, supabase);
  if (ok) refresh();
  return { ok };
}
