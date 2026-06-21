const requiredNames = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
];

const optionalNames = ["NEXT_PUBLIC_SENTRY_DSN"];

function getRequiredEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing ${name}; only variable names are read by this check.`);
  }

  return value;
}

async function main() {
  const token = getRequiredEnv("VERCEL_TOKEN");
  const projectId = getRequiredEnv("VERCEL_PROJECT_ID");
  const teamId = process.env.VERCEL_ORG_ID?.trim();
  const query = new URLSearchParams({ target: "production" });

  if (teamId) {
    query.set("teamId", teamId);
  }

  const response = await fetch(
    `https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}/env?${query}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Vercel environment lookup failed with HTTP ${response.status}.`);
  }

  const payload = await response.json();
  const names = new Set(
    Array.isArray(payload.envs)
      ? payload.envs
          .filter((entry) => entry?.target?.includes?.("production"))
          .map((entry) => entry.key)
      : [],
  );
  const missing = requiredNames.filter((name) => !names.has(name));

  for (const name of requiredNames) {
    console.log(`[${names.has(name) ? "PASS" : "FAIL"}] ${name}`);
  }

  for (const name of optionalNames) {
    console.log(`[${names.has(name) ? "PASS" : "INFO"}] optional ${name}`);
  }

  if (missing.length > 0) {
    console.error(`Missing Vercel production variables: ${missing.join(", ")}`);
    process.exit(1);
  }

  console.log("Vercel production environment variable names are present.");
}

main().catch((error) => {
  console.error("Vercel environment check failed:");
  console.error(error);
  process.exit(1);
});
