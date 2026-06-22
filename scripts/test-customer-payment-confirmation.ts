import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { confirmPaymentByCustomer } from "@/services/payments";

const root = process.cwd();
const runId = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
const password = "LocalPaymentTest-2026!";

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
    throw new Error("Payment integration test only runs against local Supabase.");
  }

  const anonKey = getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const customerClient = createClient<Database>(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const email = `payment-${runId}+launchtest@fuwu.test`;
  let userId: string | null = null;
  let requestId: string | null = null;
  let paymentId: string | null = null;

  try {
    const { data: userData, error: userError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      password,
      user_metadata: { full_name: "Payment Integration Test" },
    });

    if (userError || !userData.user) {
      throw userError ?? new Error("Payment test user could not be created.");
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
      throw new Error("Payment test category or district seed is missing.");
    }

    const { data: request, error: requestError } = await admin
      .from("service_requests")
      .insert({
        address: "Payment Test Kadıköy",
        category_id: category.id,
        description: "Müşteri ödeme onayı entegrasyon testi",
        district_id: district.id,
        payment_preference: "cash",
        status: "completed",
        urgency: "normal",
        urgency_type: "standard",
        user_id: userId,
      })
      .select("id")
      .single();

    if (requestError || !request) {
      throw requestError ?? new Error("Payment test request could not be created.");
    }

    requestId = request.id;
    const { data: payment, error: paymentError } = await admin
      .from("payments")
      .insert({
        amount: 1250,
        payment_method: "cash",
        request_id: requestId,
        status: "pending_confirmation",
      })
      .select("id")
      .single();

    if (paymentError || !payment) {
      throw paymentError ?? new Error("Pending payment could not be created.");
    }

    paymentId = payment.id;
    const confirmed = await confirmPaymentByCustomer(requestId, customerClient);
    const [{ data: persistedPayment }, { data: auditLog }] = await Promise.all([
      admin
        .from("payments")
        .select("status, confirmed_at, confirmed_by")
        .eq("id", paymentId)
        .single(),
      admin
        .from("audit_logs")
        .select("id, action, actor_user_id, entity_id, metadata")
        .eq("action", "payment.confirmed_by_customer")
        .eq("entity_id", paymentId)
        .single(),
    ]);

    if (
      confirmed.status !== "confirmed" ||
      !persistedPayment?.confirmed_at ||
      persistedPayment.confirmed_by !== userId ||
      persistedPayment.status !== "confirmed"
    ) {
      throw new Error("Customer payment confirmation was not persisted correctly.");
    }

    if (
      !auditLog ||
      auditLog.actor_user_id !== userId ||
      auditLog.entity_id !== paymentId
    ) {
      throw new Error("Customer payment confirmation audit log is missing.");
    }

    console.log("[PASS] owner completed request changed payment to confirmed");
    console.log(
      `[PASS] audit_logs action=${auditLog.action} actor_user_id=${auditLog.actor_user_id} entity_id=${auditLog.entity_id}`,
    );
  } finally {
    if (paymentId) {
      await admin
        .from("audit_logs")
        .delete()
        .eq("action", "payment.confirmed_by_customer")
        .eq("entity_id", paymentId);
      await admin.from("payments").delete().eq("id", paymentId);
    }

    if (requestId) {
      await admin.from("service_requests").delete().eq("id", requestId);
    }

    if (userId) {
      await admin.auth.admin.deleteUser(userId);
    }
  }
}

main().catch((error) => {
  console.error("Customer payment confirmation integration test failed:");
  console.error(error);
  process.exit(1);
});
