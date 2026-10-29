import { loadTestEnvironment } from "./testing/environment.mjs";
import { createClient } from "@supabase/supabase-js";


function loadEnvFile(fileName) {
  void fileName;
  const {env,safety}=loadTestEnvironment();
  if(!safety.ready) throw new Error('BLOCKED: isolated test Supabase required');
  Object.assign(process.env,env);
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
  );
}

if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/i.test(supabaseUrl)) {
  throw new Error("Assignment race test is restricted to local Supabase.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

let providerIds = [];
let requestId = null;

try {
  const [{ data: category }, { data: district }] = await Promise.all([
    supabase
      .from("service_categories")
      .select("id")
      .eq("is_active", true)
      .limit(1)
      .single(),
    supabase
      .from("districts")
      .select("id")
      .eq("is_active", true)
      .limit(1)
      .single(),
  ]);

  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const { data: providers, error: providersError } = await supabase
    .from("providers")
    .insert([
      {
        category_id: category.id,
        district_id: district.id,
        is_active: true,
        is_approved: true,
        name: `Race Provider A ${suffix}`,
        phone: `+90555${suffix.slice(-7)}1`,
      },
      {
        category_id: category.id,
        district_id: district.id,
        is_active: true,
        is_approved: true,
        name: `Race Provider B ${suffix}`,
        phone: `+90555${suffix.slice(-7)}2`,
      },
    ])
    .select("id");

  if (providersError || !providers || providers.length !== 2) {
    throw providersError ?? new Error("Two race-test providers could not be created.");
  }

  providerIds = providers.map((provider) => provider.id);

  const { data: request, error: requestError } = await supabase
    .from("service_requests")
    .insert({
      address: "Assignment race test address",
      category_id: category.id,
      district_id: district.id,
      status: "pending",
      urgency: "normal",
      urgency_type: "standard",
      user_id: null,
    })
    .select("id, status, updated_at, assigned_provider_id")
    .single();

  if (requestError) {
    throw requestError;
  }

  requestId = request.id;

  const attemptAssignment = (providerId) =>
    supabase
      .from("service_requests")
      .update({
        assigned_provider_id: providerId,
        status: "assigned",
        updated_at: new Date().toISOString(),
      })
      .eq("id", request.id)
      .eq("status", request.status)
      .eq("updated_at", request.updated_at)
      .is("assigned_provider_id", null)
      .select("id")
      .maybeSingle();

  const results = await Promise.all(providerIds.map(attemptAssignment));
  const successes = results.filter((result) => result.data?.id && !result.error);
  const conflicts = results.filter((result) => !result.data && !result.error);

  if (successes.length !== 1 || conflicts.length !== 1) {
    throw new Error(
      `Expected one success and one conflict; got ${successes.length} success(es), ${conflicts.length} conflict(s).`,
    );
  }

  console.log("Admin assignment race test passed: one success, one already-assigned conflict.");
} finally {
  if (requestId) {
    await supabase.from("service_requests").delete().eq("id", requestId);
  }

  if (providerIds.length > 0) {
    await supabase.from("providers").delete().in("id", providerIds);
  }
}
