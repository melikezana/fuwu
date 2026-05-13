import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./types";

export type SupabaseClientConfig = {
  url: string;
  anonKey: string;
};

// Real Supabase values belong in .env.local later. Keep .env.example blank and key-free.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const isSupabaseAuthConfigured = isSupabaseConfigured;

export function getSupabaseClientConfig(): SupabaseClientConfig | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "Supabase env vars are not set. Add the real project URL and anon key to .env.local when Supabase is connected.",
      );
    }

    return null;
  }

  return {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
  };
}

export function createClient(): SupabaseClient<Database> | null {
  const config = getSupabaseClientConfig();

  if (!config) {
    return null;
  }

  return createBrowserClient<Database>(config.url, config.anonKey);
}

export const createSupabaseBrowserClient = createClient;
export type SupabaseDatabase = Database;
