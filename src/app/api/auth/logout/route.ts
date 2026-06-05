import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();

    if (supabase) {
      await supabase.auth.signOut();
    }
  } catch (err) {
    console.error("[Auth API] Sign out failed:", err);
  }

  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_SITE_URL ?? "https://fuwu-nine.vercel.app"), {
    status: 303,
  });
}
