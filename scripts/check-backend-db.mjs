import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();

const expectedTables = [
  "profiles",
  "providers",
  "provider_applications",
  "service_requests",
  "service_categories",
  "districts",
  "audit_logs",
  "rate_limits",
  "payments",
  "notifications",
];

const expectedFunctions = [
  "current_user_is_admin",
  "handle_new_user",
  "bind_provider_applications_to_current_user",
];

const expectedCategorySlugs = [
  "tesisat",
  "cilingir",
  "elektrik-hizmeti",
  "temizlik",
  "hali-yikama",
  "klima-beyaz-esya",
  "mobilya-montaj",
  "boya-badana",
  "nakliye-yardimi",
  "bahce-bakimi",
  "havuz-bakimi",
];

const expectedStorageBuckets = [
  "provider-images",
  "provider-verification-documents",
];

const results = [];

function loadEnvFile(fileName) {
  const path = join(root, fileName);

  if (!existsSync(path)) {
    return;
  }

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const existingValue = process.env[key];

    if (existingValue) {
      continue;
    }

    const rawValue = trimmedLine.slice(separatorIndex + 1).trim();
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

function recordCheck(name, passed, details) {
  results.push({ details, name, passed });
}

function getRequiredEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable ${name}.`);
  }

  return value;
}

function getCatalogMap(catalog, key) {
  const value = catalog?.[key];
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function printResults() {
  for (const result of results) {
    const status = result.passed ? "PASS" : "FAIL";
    const suffix = result.details ? ` - ${result.details}` : "";
    console.log(`[${status}] ${result.name}${suffix}`);
  }
}

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    "http://127.0.0.1:54321";
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  for (const table of expectedTables) {
    const { error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true });

    recordCheck(
      `table exists: ${table}`,
      !error,
      error ? error.message : "reachable with service role",
    );
  }

  const { data: categories, error: categoryError } = await supabase
    .from("service_categories")
    .select("id, slug")
    .in("slug", expectedCategorySlugs);
  const categorySlugs = new Set((categories ?? []).map((category) => category.slug));
  const missingCategories = expectedCategorySlugs.filter(
    (slug) => !categorySlugs.has(slug),
  );

  recordCheck(
    "service_categories contains production catalog",
    !categoryError && missingCategories.length === 0,
    categoryError
      ? categoryError.message
      : missingCategories.length > 0
        ? `missing: ${missingCategories.join(", ")}`
        : `${categorySlugs.size} expected categories found`,
  );

  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  const bucketIds = new Set((buckets ?? []).map((bucket) => bucket.id));

  for (const bucketId of expectedStorageBuckets) {
    recordCheck(
      `storage bucket exists: ${bucketId}`,
      !bucketsError && bucketIds.has(bucketId),
      bucketsError
        ? bucketsError.message
        : bucketIds.has(bucketId)
          ? "bucket reachable"
          : "missing",
    );
  }

  const { data: catalog, error: catalogError } = await supabase.rpc(
    "backend_health_catalog",
  );

  recordCheck(
    "backend catalog RPC is callable",
    !catalogError && Boolean(catalog),
    catalogError ? catalogError.message : "metadata returned",
  );

  if (!catalogError && catalog) {
    const tableCatalog = getCatalogMap(catalog, "tables");
    const functionCatalog = getCatalogMap(catalog, "functions");

    for (const table of expectedTables) {
      const tableStatus = tableCatalog[table];
      const policies = Array.isArray(tableStatus?.policies)
        ? tableStatus.policies
        : [];

      recordCheck(
        `catalog table exists: ${table}`,
        tableStatus?.exists === true,
        tableStatus?.exists === true ? "pg_class match" : "missing from pg_class",
      );
      recordCheck(
        `RLS enabled: ${table}`,
        tableStatus?.rlsEnabled === true,
        tableStatus?.rlsEnabled === true
          ? `${policies.length} policy/policies`
          : "relrowsecurity is false",
      );
      recordCheck(
        `RLS policies present: ${table}`,
        policies.length > 0,
        policies.length > 0 ? policies.join(", ") : "no policies in pg_policies",
      );
    }

    for (const functionName of expectedFunctions) {
      recordCheck(
        `function exists: public.${functionName}`,
        functionCatalog[functionName]?.exists === true,
        functionCatalog[functionName]?.exists === true
          ? "pg_proc match"
          : "missing from pg_proc",
      );
    }

    recordCheck(
      "payments.request_id references service_requests.id",
      catalog.paymentsServiceRequestsForeignKey === true,
      catalog.paymentsServiceRequestsForeignKey === true
        ? "foreign key present"
        : "foreign key missing",
    );
  }

  printResults();

  const failures = results.filter((result) => !result.passed);

  if (failures.length > 0) {
    console.error(`Backend DB health check failed with ${failures.length} failure(s).`);
    process.exit(1);
  }

  console.log("Backend DB health check passed.");
}

main().catch((error) => {
  console.error("Backend DB health check crashed:");
  console.error(error);
  process.exit(1);
});
