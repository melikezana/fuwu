import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const DEFAULT_ADMIN_EMAIL = "admin@fuwu.test";

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

    if (process.env[key]) {
      continue;
    }

    process.env[key] = trimmedLine
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
}

function getRequiredEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable ${name}.`);
  }

  return value;
}

async function findUserByEmail(supabase, email) {
  const normalizedEmail = email.toLocaleLowerCase("en-US");
  let page = 1;

  while (page <= 100) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 100,
    });

    if (error) {
      throw error;
    }

    const match = data.users.find(
      (user) => user.email?.toLocaleLowerCase("en-US") === normalizedEmail,
    );

    if (match) {
      return match;
    }

    if (data.users.length < 100) {
      return null;
    }

    page += 1;
  }

  return null;
}

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const targetEmail =
    process.argv[2]?.trim() ||
    process.env.ADMIN_SEED_EMAIL?.trim() ||
    DEFAULT_ADMIN_EMAIL;
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

  const user = await findUserByEmail(supabase, targetEmail);

  if (!user) {
    throw new Error(
      `No Supabase Auth user found for ${targetEmail}. Sign up locally first, then rerun this script.`,
    );
  }

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        role: "admin",
      },
      { onConflict: "id" },
    )
    .select("id, role")
    .single();

  if (error) {
    throw error;
  }

  console.log(`Promoted ${targetEmail} to ${data.role} (${data.id}).`);
}

main().catch((error) => {
  console.error("Admin promotion failed:");
  console.error(error);
  process.exit(1);
});
