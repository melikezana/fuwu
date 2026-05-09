import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import type { Database } from "./types";

export type SupabaseServerConfig = {
  url: string;
  anonKey: string;
};

// Real Supabase values belong in .env.local later. Keep .env.example blank and key-free.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseServerConfigured = Boolean(
  supabaseUrl && supabaseAnonKey,
);

export function getSupabaseServerConfig(): SupabaseServerConfig | null {
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

export async function createClient(): Promise<SupabaseClient<Database> | null> {
  const config = getSupabaseServerConfig();

  if (!config) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies. Auth/proxy wiring will handle this later.
        }
      },
    },
  });
}

export const createSupabaseServerClient = createClient;
