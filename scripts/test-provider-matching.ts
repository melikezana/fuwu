import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createClient,
  type RealtimeChannel,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import { matchAndNotifyEligibleProviders } from "@/services/matching";
import { getProviderAssignedRequests } from "@/services/requests";
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
  const providerClient = createClient<Database>(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const createdUserIds: string[] = [];
  let notificationChannel: RealtimeChannel | null = null;

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

    const { data: insertedProviders, error: providerError } = await admin
      .from("providers")
      .insert([
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
      ])
      .select("id, user_id");

    if (providerError) {
      throw providerError;
    }

    const matchingProviderOneRecord = insertedProviders?.find(
      (provider) => provider.user_id === matchingProviderOne.id,
    );

    if (!matchingProviderOneRecord) {
      throw new Error("Matching provider record was not created.");
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

    const providerEmail = matchingProviderOne.email;

    if (!providerEmail) {
      throw new Error("Provider test email is missing.");
    }

    const { error: providerSignInError } =
      await providerClient.auth.signInWithPassword({
        email: providerEmail,
        password,
      });

    if (providerSignInError) {
      throw providerSignInError;
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

    let resolveRealtimeEvent: ((notificationId: string) => void) | null = null;
    let realtimeEventTimeout: ReturnType<typeof setTimeout> | null = null;
    const realtimeEvent = new Promise<string>((resolve, reject) => {
      resolveRealtimeEvent = resolve;
      realtimeEventTimeout = setTimeout(
        () => reject(new Error("Timed out waiting for notification Realtime INSERT.")),
        10_000,
      );
    });
    const realtimeSubscribed = new Promise<void>((resolve, reject) => {
      notificationChannel = providerClient
        .channel(`provider-matching-test-${runId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            filter: `recipient_user_id=eq.${matchingProviderOne.id}`,
            schema: "public",
            table: "notifications",
          },
          (payload) => {
            const notification = payload.new as {
              id?: unknown;
              request_id?: unknown;
              type?: unknown;
            };

            if (
              notification.request_id === request.id &&
              notification.type === "new_service_request_match" &&
              typeof notification.id === "string"
            ) {
              if (realtimeEventTimeout) {
                clearTimeout(realtimeEventTimeout);
                realtimeEventTimeout = null;
              }
              resolveRealtimeEvent?.(notification.id);
            }
          },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            resolve();
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            reject(new Error(`Realtime subscription failed with status ${status}.`));
          }
        });
    });

    await realtimeSubscribed;

    const notifiedCount = await matchAndNotifyEligibleProviders(customerClient, {
      categoryId: locksmith.id,
      districtId: kadikoy.id,
      requestId: request.id,
      urgencyType: "standard",
    });
    const realtimeNotificationId = await realtimeEvent;
    const retryNotifiedCount = await matchAndNotifyEligibleProviders(customerClient, {
      categoryId: locksmith.id,
      districtId: kadikoy.id,
      requestId: request.id,
      urgencyType: "standard",
    });
    const providerRequestList = await getProviderAssignedRequests(
      matchingProviderOneRecord.id,
      providerClient,
    );
    const { data: notifications, error: notificationError } = await admin
      .from("notifications")
      .select("id, provider_id, recipient_user_id, request_id, type")
      .eq("request_id", request.id)
      .eq("type", "new_service_request_match");

    if (notificationError) {
      throw notificationError;
    }

    if (
      notifiedCount !== 2 ||
      retryNotifiedCount !== 0 ||
      notifications?.length !== 2
    ) {
      throw new Error(
        `Expected first=2, retry=0 and rows=2; got first=${notifiedCount}, retry=${retryNotifiedCount}, rows=${notifications?.length ?? 0}.`,
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

    if (!notifications.some((notification) => notification.id === realtimeNotificationId)) {
      throw new Error("Realtime notification does not match the persisted notification row.");
    }

    if (!providerRequestList.some((providerRequest) => providerRequest.id === request.id)) {
      throw new Error("Realtime-matched request did not appear in the provider request list.");
    }

    console.log(
      "PASS: batch insert reached 2 eligible providers, retry inserted 0 duplicates, Realtime delivered the INSERT, and the matched request appeared in the provider list query.",
    );
  } finally {
    if (notificationChannel) {
      await providerClient.removeChannel(notificationChannel);
    }

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
