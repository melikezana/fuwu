import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

import { logWarn } from "@/lib/logger";
import type { Database } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseServiceRoleConfigured = Boolean(
  supabaseUrl && supabaseServiceRoleKey,
);

export function createSupabaseServiceRoleClient(): SupabaseClient<Database> | null {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    logWarn(
      "Supabase service-role configuration is not set. Add project URL and service role key for server jobs.",
    );

    return null;
  }

  return createSupabaseClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
