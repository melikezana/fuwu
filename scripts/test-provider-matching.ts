import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { matchAndNotifyEligibleProviders } from "@/services/matching";
import type { Database } from "@/lib/supabase/types";

const root = process.cwd();
const password = "LocalLaunchTest-2026!";
const runId = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;

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

async function createTestUser(
  admin: SupabaseClient<Database>,
  label: string,
): Promise<User> {
  const email = `${label}-${runId}+launchtest@fuwu.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
    user_metadata: {
      full_name: `Launch Test ${label}`,
    },
  });

  if (error || !data.user) {
    throw error ?? new Error(`Could not create ${label} test user.`);
  }

  return data.user;
}

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    "http://127.0.0.1:54321";
  const isLocal = /^https?:\/\/(127\.0\.0\.1|localhost)/.test(supabaseUrl);

  if (!isLocal && process.env.ALLOW_REMOTE_MATCHING_TEST !== "true") {
    throw new Error(
      "Refusing to seed a remote Supabase project. Use local Supabase or set ALLOW_REMOTE_MATCHING_TEST=true explicitly.",
    );
  }

  const anonKey = getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const customerClient = createClient<Database>(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const createdUserIds: string[] = [];

  try {
    const [customer, matchingProviderOne, matchingProviderTwo, otherProvider] =
      await Promise.all([
        createTestUser(admin, "customer"),
        createTestUser(admin, "locksmith-one"),
        createTestUser(admin, "locksmith-two"),
        createTestUser(admin, "plumber"),
      ]);
    createdUserIds.push(
      customer.id,
      matchingProviderOne.id,
      matchingProviderTwo.id,
      otherProvider.id,
    );

    const [{ data: locksmith }, { data: plumbing }, { data: kadikoy }, { data: uskudar }] =
      await Promise.all([
        admin.from("service_categories").select("id").eq("slug", "cilingir").single(),
        admin.from("service_categories").select("id").eq("slug", "tesisat").single(),
        admin.from("districts").select("id").eq("slug", "kadikoy").single(),
        admin.from("districts").select("id").eq("slug", "uskudar").single(),
      ]);

    if (!locksmith || !plumbing || !kadikoy || !uskudar) {
      throw new Error("Required local category/district seed records are missing.");
    }

    const { error: providerError } = await admin.from("providers").insert([
      {
        category_id: locksmith.id,
        district_id: kadikoy.id,
        is_active: true,
        is_approved: true,
        name: "Launch Test Çilingir 1",
        phone: "+90 555 900 00 01",
        user_id: matchingProviderOne.id,
      },
      {
        category_id: locksmith.id,
        district_id: kadikoy.id,
        is_active: true,
        is_approved: true,
        name: "Launch Test Çilingir 2",
        phone: "+90 555 900 00 02",
        user_id: matchingProviderTwo.id,
      },
      {
        category_id: plumbing.id,
        district_id: uskudar.id,
        is_active: true,
        is_approved: true,
        name: "Launch Test Tesisat",
        phone: "+90 555 900 00 03",
        user_id: otherProvider.id,
      },
    ]);

    if (providerError) {
      throw providerError;
    }

    const customerEmail = customer.email;

    if (!customerEmail) {
      throw new Error("Customer test email is missing.");
    }

    const { error: signInError } = await customerClient.auth.signInWithPassword({
      email: customerEmail,
      password,
    });

    if (signInError) {
      throw signInError;
    }

    const { data: request, error: requestError } = await customerClient
      .from("service_requests")
      .insert({
        address: "Launch Test Kadıköy",
        category_id: locksmith.id,
        description: "Otomatik eşleştirme doğrulama talebi",
        district_id: kadikoy.id,
        status: "pending",
        urgency: "normal",
        urgency_type: "standard",
        user_id: customer.id,
      })
      .select("id")
      .single();

    if (requestError || !request) {
      throw requestError ?? new Error("Test service request was not created.");
    }

    const notifiedCount = await matchAndNotifyEligibleProviders(customerClient, {
      categoryId: locksmith.id,
      districtId: kadikoy.id,
      requestId: request.id,
      urgencyType: "standard",
    });
    const { data: notifications, error: notificationError } = await admin
      .from("notifications")
      .select("id, provider_id, recipient_user_id, request_id, type")
      .eq("request_id", request.id)
      .eq("type", "new_service_request_match");

    if (notificationError) {
      throw notificationError;
    }

    if (notifiedCount !== 2 || notifications?.length !== 2) {
      throw new Error(
        `Expected 2 provider notifications, got function=${notifiedCount}, rows=${notifications?.length ?? 0}.`,
      );
    }

    const recipientIds = new Set(
      notifications.map((notification) => notification.recipient_user_id),
    );

    if (
      !recipientIds.has(matchingProviderOne.id) ||
      !recipientIds.has(matchingProviderTwo.id) ||
      recipientIds.has(otherProvider.id)
    ) {
      throw new Error("Notification recipients do not match category + district eligibility.");
    }

    console.log(
      `PASS: 2 eligible locksmith providers received 2 notifications; the other category/district provider received 0.`,
    );
  } finally {
    if (createdUserIds.length > 0) {
      await admin.from("providers").delete().in("user_id", createdUserIds);
      await admin.from("provider_applications").delete().in("user_id", createdUserIds);
      await admin.from("service_requests").delete().in("user_id", createdUserIds);

      for (const userId of createdUserIds) {
        await admin.auth.admin.deleteUser(userId);
      }
    }
  }
}

main().catch((error) => {
  console.error("Provider matching integration test failed:");
  console.error(error);
  process.exit(1);
});
