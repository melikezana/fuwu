import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/errors";
import type { Database } from "@/lib/supabase/types";
import { submitProviderReview } from "@/services/reviews";

const root = process.cwd();
const runId = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
const password = "LocalReviewTest-2026!";

function loadEnvFile(fileName: string) {
  const path = join(root, fileName);

  if (!existsSync(path)) {
    return;
  }

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#") || !trimmedLine.includes("=")) {
      continue;
    }

    const [key, ...valueParts] = trimmedLine.split("=");
    process.env[key] ??= valueParts.join("=").trim().replace(/^["']|["']$/g, "");
  }
}

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable ${name}.`);
  }

  return value;
}

async function main() {
  loadEnvFile(".env.test");

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "http://127.0.0.1:54321";

  if (!/^https?:\/\/(127\.0\.0\.1|localhost)/.test(supabaseUrl)) {
    throw new Error("Review integration test only runs against local Supabase.");
  }

  const anonKey = getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const customerClient = createClient<Database>(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const email = `review-${runId}+launchtest@fuwu.test`;
  let userId: string | null = null;
  let providerId: string | null = null;
  let requestId: string | null = null;

  try {
    const { data: userData, error: userError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      password,
      user_metadata: { full_name: "Review Integration Test" },
    });

    if (userError || !userData.user) {
      throw userError ?? new Error("Review test user could not be created.");
    }

    userId = userData.user.id;

    const { error: signInError } = await customerClient.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      throw signInError;
    }

    const [{ data: category }, { data: district }] = await Promise.all([
      admin.from("service_categories").select("id").eq("slug", "tesisat").single(),
      admin.from("districts").select("id").eq("slug", "kadikoy").single(),
    ]);

    if (!category || !district) {
      throw new Error("Review test category or district seed is missing.");
    }

    const { data: provider, error: providerError } = await admin
      .from("providers")
      .insert({
        category_id: category.id,
        district_id: district.id,
        is_active: true,
        is_approved: true,
        name: "Review Integration Provider",
        phone: `+90 555 ${runId.slice(-7)}`,
      })
      .select("id")
      .single();

    if (providerError || !provider) {
      throw providerError ?? new Error("Review test provider could not be created.");
    }

    providerId = provider.id;
    let ineligibleRejected = false;

    try {
      await submitProviderReview(
        {
          comment: "Tamamlanmış iş olmadan gönderilmemesi gereken test yorumu.",
          providerId,
          rating: 5,
        },
        customerClient,
      );
    } catch (error) {
      ineligibleRejected =
        error instanceof AppError && error.code === "review-not-eligible";
    }

    if (!ineligibleRejected) {
      throw new Error("Review without a completed request was not rejected.");
    }

    const { data: request, error: requestError } = await admin
      .from("service_requests")
      .insert({
        address: "Review Test Kadıköy",
        assigned_provider_id: providerId,
        category_id: category.id,
        description: "Tamamlanmış yorum uygunluk testi",
        district_id: district.id,
        status: "completed",
        urgency: "normal",
        urgency_type: "standard",
        user_id: userId,
      })
      .select("id")
      .single();

    if (requestError || !request) {
      throw requestError ?? new Error("Completed review test request could not be created.");
    }

    requestId = request.id;
    const result = await submitProviderReview(
      {
        comment: "İletişimi güçlüydü ve işi zamanında, temiz biçimde tamamladı.",
        providerId,
        rating: 5,
      },
      customerClient,
    );
    const [{ data: review }, { data: providerSummary }] = await Promise.all([
      admin
        .from("reviews")
        .select("id, user_id, provider_id, rating")
        .eq("id", result.id)
        .single(),
      admin
        .from("providers")
        .select("rating, review_count")
        .eq("id", providerId)
        .single(),
    ]);

    if (
      !review ||
      review.user_id !== userId ||
      review.provider_id !== providerId ||
      review.rating !== 5
    ) {
      throw new Error("Eligible review was not persisted with the expected ownership.");
    }

    if (
      !providerSummary ||
      Number(providerSummary.rating) !== 5 ||
      providerSummary.review_count !== 1
    ) {
      throw new Error("Provider rating summary was not refreshed after review insert.");
    }

    console.log("[PASS] review-not-eligible rejected without a completed request");
    console.log("[PASS] eligible completed request created one owned review");
    console.log("[PASS] provider rating=5 and review_count=1");
  } finally {
    if (providerId) {
      await admin.from("reviews").delete().eq("provider_id", providerId);
    }

    if (requestId) {
      await admin.from("service_requests").delete().eq("id", requestId);
    }

    if (providerId) {
      await admin.from("providers").delete().eq("id", providerId);
    }

    if (userId) {
      await admin.auth.admin.deleteUser(userId);
    }
  }
}

main().catch((error) => {
  console.error("Review submission integration test failed:");
  console.error(error);
  process.exit(1);
});
