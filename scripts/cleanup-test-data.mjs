import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const safeEmailFragment = "+launchtest@";

function loadEnvFile(fileName) {
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

function getRequiredEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable ${name}.`);
  }

  return value;
}

async function listLaunchTestUsers(supabase) {
  const users = [];
  let page = 1;

  while (page <= 100) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 100,
    });

    if (error) {
      throw error;
    }

    users.push(
      ...data.users.filter((user) =>
        user.email?.toLocaleLowerCase("en-US").includes(safeEmailFragment),
      ),
    );

    if (data.users.length < 100) {
      break;
    }

    page += 1;
  }

  return users;
}

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  if (!process.argv.includes("--confirm")) {
    throw new Error(
      "Refusing cleanup without --confirm. Only emails containing +launchtest@ are eligible.",
    );
  }

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
  const users = await listLaunchTestUsers(supabase);
  const userIds = users.map((user) => user.id);

  if (userIds.length === 0) {
    console.log("No +launchtest@ users found; nothing was deleted.");
    return;
  }

  const { data: applicationFiles, error: applicationFilesError } = await supabase
    .from("provider_applications")
    .select("profile_image_path, verification_document_path")
    .in("user_id", userIds);

  if (applicationFilesError) {
    throw applicationFilesError;
  }

  const profileImagePaths = (applicationFiles ?? [])
    .map((application) => application.profile_image_path)
    .filter(Boolean);
  const verificationDocumentPaths = (applicationFiles ?? [])
    .map((application) => application.verification_document_path)
    .filter(Boolean);

  if (profileImagePaths.length > 0) {
    const { error } = await supabase.storage
      .from("provider-images")
      .remove(profileImagePaths);

    if (error) {
      throw new Error(`provider-images cleanup failed: ${error.message}`);
    }
  }

  if (verificationDocumentPaths.length > 0) {
    const { error } = await supabase.storage
      .from("provider-verification-documents")
      .remove(verificationDocumentPaths);

    if (error) {
      throw new Error(
        `provider-verification-documents cleanup failed: ${error.message}`,
      );
    }
  }

  const cleanupTables = [
    ["notifications", "recipient_user_id"],
    ["providers", "user_id"],
    ["provider_applications", "user_id"],
    ["service_requests", "user_id"],
    ["rate_limits", "user_id"],
    ["audit_logs", "actor_user_id"],
    ["profiles", "id"],
  ];

  for (const [table, column] of cleanupTables) {
    const { error } = await supabase.from(table).delete().in(column, userIds);

    if (error) {
      throw new Error(`${table} cleanup failed: ${error.message}`);
    }
  }

  for (const user of users) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);

    if (error) {
      throw error;
    }
  }

  console.log(`Deleted ${users.length} launch-test user(s) and scoped related records.`);
}

main().catch((error) => {
  console.error("Launch-test cleanup failed:");
  console.error(error);
  process.exit(1);
});
