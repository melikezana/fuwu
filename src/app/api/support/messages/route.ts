import { type NextRequest, NextResponse } from "next/server";
import { logWarn } from "@/lib/logger";
import { checkApiRateLimit, getApiRateLimitHeaders } from "@/lib/security";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isValidEmail, sanitizeEmail, sanitizeText } from "@/lib/validations";

type SupportMessageClient = {
  auth: {
    getUser: () => Promise<{
      data: {
        user: {
          id: string;
        } | null;
      };
      error: unknown;
    }>;
  };
  from: (table: string) => {
    insert: (value: Record<string, unknown>) => Promise<{
      data: unknown;
      error: unknown;
    }>;
  };
};

function supportJson(body: Record<string, unknown>, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

export async function POST(request: NextRequest) {
  const rateLimit = await checkApiRateLimit(request, {
    action: "api.support.messages",
    limit: 8,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return supportJson(
      {
        message: "Çok fazla destek isteği gönderildi. Lütfen biraz sonra tekrar dene.",
      },
      {
        headers: getApiRateLimitHeaders(rateLimit),
        status: 429,
      },
    );
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const subject = sanitizeText(String(body?.subject ?? ""), 160);
  const email = sanitizeEmail(String(body?.email ?? ""));
  const message = sanitizeText(String(body?.message ?? ""), 2_000);
  const analysisSummary = sanitizeText(String(body?.analysisSummary ?? ""), 1_000);
  const imageReference = sanitizeText(String(body?.imageReference ?? ""), 120);

  if (!subject || !message || !isValidEmail(email)) {
    return supportJson(
      {
        message: "Konu, geçerli e-posta ve mesaj alanları zorunludur.",
      },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return supportJson(
      {
        message: "Destek formu şu anda gönderilemedi. Lütfen biraz sonra tekrar dene.",
      },
      { status: 503 },
    );
  }

  try {
    const client = supabase as unknown as SupportMessageClient;
    const {
      data: { user },
    } = await client.auth.getUser();
    const { error } = await client.from("support_messages").insert({
      analysis_summary: analysisSummary || null,
      email,
      image_reference: imageReference || null,
      message,
      subject,
      user_id: user?.id ?? null,
    });

    if (error) {
      throw error;
    }

    return supportJson({
      message: "Mesajın Fuwu Destek ekibine iletildi.",
      ok: true,
    });
  } catch (error) {
    logWarn("Support message insert failed.", {
      reason: error instanceof Error ? error.message : String(error),
    });

    return supportJson(
      {
        message: "Destek formu şu anda gönderilemedi. Lütfen biraz sonra tekrar dene.",
      },
      { status: 502 },
    );
  }
}

