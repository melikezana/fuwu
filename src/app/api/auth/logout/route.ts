import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("[Auth API] Sign out error:", error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Auth API] Sign out failed:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
