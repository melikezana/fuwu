import { NextResponse } from "next/server";

import { logWarn } from "@/lib/logger";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const AI_ASSISTANT_OPENAI_FAILURE_ACTION = "ai_assistant.openai_failure";
const ALERT_THRESHOLD = 5;
const LOOKBACK_MINUTES = 15;

function getCronAuthorizationError(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret) {
    return {
      message: "CRON_SECRET is not configured.",
      status: 500,
    };
  }

  const authorization = request.headers.get("authorization")?.trim();

  if (authorization !== `Bearer ${cronSecret}`) {
    return {
      message: "Unauthorized.",
      status: 401,
    };
  }

  return null;
}

function getLookbackCutoffIso() {
  return new Date(Date.now() - LOOKBACK_MINUTES * 60 * 1000).toISOString();
}

function getSlackWebhookUrl() {
  const value = process.env.SLACK_ALERT_WEBHOOK_URL?.trim();

  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

async function sendSlackAlert({
  count,
  cutoffIso,
}: {
  count: number;
  cutoffIso: string;
}) {
  const webhookUrl = getSlackWebhookUrl();

  if (!webhookUrl) {
    return "skipped_no_webhook" as const;
  }

  const response = await fetch(webhookUrl, {
    body: JSON.stringify({
      text:
        `FUWU AI assistant OpenAI failure alarm: ${count} failures ` +
        `since ${cutoffIso}. Check OPENAI_API_KEY billing/quota and key validity.`,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Slack webhook failed with HTTP ${response.status}.`);
  }

  return "sent" as const;
}

export async function GET(request: Request) {
  const authorizationError = getCronAuthorizationError(request);

  if (authorizationError) {
    return NextResponse.json(
      { error: authorizationError.message, ok: false },
      { status: authorizationError.status },
    );
  }

  const supabase = createSupabaseServiceRoleClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase service role is not configured.", ok: false },
      { status: 500 },
    );
  }

  const cutoffIso = getLookbackCutoffIso();
  const { count, error } = await supabase
    .from("audit_logs")
    .select("id", { count: "exact", head: true })
    .eq("action", AI_ASSISTANT_OPENAI_FAILURE_ACTION)
    .gte("created_at", cutoffIso);

  if (error) {
    logWarn("AI assistant health check audit lookup failed.", {
      action: AI_ASSISTANT_OPENAI_FAILURE_ACTION,
      cutoffIso,
      supabaseError: error,
    });

    return NextResponse.json(
      { error: "AI assistant health check lookup failed.", ok: false },
      { status: 500 },
    );
  }

  const failureCount = count ?? 0;
  let alertStatus: "below_threshold" | "sent" | "skipped_no_webhook" = "below_threshold";

  if (failureCount > ALERT_THRESHOLD) {
    try {
      alertStatus = await sendSlackAlert({
        count: failureCount,
        cutoffIso,
      });
    } catch (alertError) {
      logWarn("AI assistant OpenAI failure alert delivery failed.", {
        alertError,
        count: failureCount,
        cutoffIso,
      });

      return NextResponse.json(
        {
          alertStatus: "failed",
          count: failureCount,
          cutoffIso,
          ok: false,
          threshold: ALERT_THRESHOLD,
        },
        { status: 502 },
      );
    }
  }

  return NextResponse.json({
    action: AI_ASSISTANT_OPENAI_FAILURE_ACTION,
    alertStatus,
    count: failureCount,
    cutoffIso,
    ok: true,
    threshold: ALERT_THRESHOLD,
    windowMinutes: LOOKBACK_MINUTES,
  });
}
