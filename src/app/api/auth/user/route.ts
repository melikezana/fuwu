import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    
    if (!supabase) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, phone, role")
      .eq("id", user.id)
      .maybeSingle();

    const fallbackProfile = profile || {
      id: user.id,
      full_name: user.email ?? "Hesabım",
      phone: null,
      role: "customer",
    };

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
      },
      profile: fallbackProfile,
    });
  } catch (err) {
    console.error("[Auth API] Session check failed:", err);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
