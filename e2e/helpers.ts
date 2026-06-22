import { createClient } from "@supabase/supabase-js";
import { expect, type Page, test } from "@playwright/test";

const isLocalSupabaseUrl = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/^https?:\/\/(127\.0\.0\.1|localhost)/),
);
const allowsRemoteTestProject = process.env.E2E_ALLOW_REMOTE_SUPABASE_TESTS === "true";

export const hasLocalSupabaseE2E = Boolean(
  (isLocalSupabaseUrl || allowsRemoteTestProject) &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export function skipUnlessLocalSupabase() {
  test.skip(!hasLocalSupabaseE2E, "Local Supabase test env is not configured.");
}

export function uniqueE2EValue(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
}

export function uniqueE2EEmail(prefix: string) {
  return `${uniqueE2EValue(prefix)}@fuwu.test`;
}

type TestUserRole = "admin" | "customer" | "provider";

export function getTestAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Local Supabase service-role test env is not configured.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function ensureTestUserRole(email: string, role: TestUserRole) {
  const admin = getTestAdminClient();
  const { data: listedUsers, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    throw listError;
  }

  let user = listedUsers.users.find(
    (candidate) => candidate.email?.toLocaleLowerCase("en") === email.toLocaleLowerCase("en"),
  );

  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: `E2E ${role}`,
      },
    });

    if (error) {
      throw error;
    }

    user = data.user;
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      full_name: `E2E ${role}`,
      role,
    })
    .eq("id", user.id);

  if (profileError) {
    throw profileError;
  }

  return user.id;
}

async function findLatestMagicLink(page: Page, email: string, requestedAt: number) {
  const mailpitUrl = process.env.E2E_MAILPIT_URL ?? "http://127.0.0.1:54324";
  const listResponse = await page.request.get(`${mailpitUrl}/api/v1/messages`);

  if (!listResponse.ok()) {
    return "";
  }

  const payload = (await listResponse.json()) as {
    messages?: Array<{
      Created?: string;
      ID?: string;
      To?: Array<{ Address?: string }>;
    }>;
  };
  const message = payload.messages?.find((candidate) => {
    const recipientMatches = candidate.To?.some(
      (recipient) =>
        recipient.Address?.toLocaleLowerCase("en") === email.toLocaleLowerCase("en"),
    );
    const createdAt = candidate.Created ? Date.parse(candidate.Created) : 0;

    return recipientMatches && createdAt >= requestedAt - 5_000;
  });

  if (!message?.ID) {
    return "";
  }

  const detailResponse = await page.request.get(
    `${mailpitUrl}/api/v1/message/${encodeURIComponent(message.ID)}`,
  );

  if (!detailResponse.ok()) {
    return "";
  }

  const detail = (await detailResponse.json()) as { HTML?: string; Text?: string };
  const htmlMatch = detail.HTML?.match(/href="([^"]+)"/i);
  const textMatch = detail.Text?.match(/https?:\/\/[^\s)]+/i);

  return (htmlMatch?.[1] ?? textMatch?.[0] ?? "").replaceAll("&amp;", "&");
}

export async function loginWithEmailMagicLink(
  page: Page,
  {
    email = uniqueE2EEmail("customer"),
    nextPath = "/account",
    role = "customer",
  }: {
    email?: string;
    nextPath?: string;
    role?: TestUserRole;
  } = {},
) {
  skipUnlessLocalSupabase();
  await ensureTestUserRole(email, role);
  const requestedAt = Date.now();

  await page.goto(`/login?next=${encodeURIComponent(nextPath)}`);
  await page.waitForTimeout(500);
  const emailInput = page.getByTestId("login-email-input");
  await emailInput.fill(email);
  await expect(emailInput).toHaveValue(email);
  await page.getByTestId("email-login-form").locator('button[type="submit"]').click();

  let magicLink = "";
  await expect
    .poll(
      async () => {
        magicLink = await findLatestMagicLink(page, email, requestedAt);
        return magicLink;
      },
      {
        timeout: 15_000,
      },
    )
    .not.toBe("");

  const verificationResponse = await page.request.get(magicLink, {
    maxRedirects: 0,
  });
  const callbackUrl = verificationResponse.headers().location;

  expect([302, 303]).toContain(verificationResponse.status());
  expect(callbackUrl).toContain("/auth/callback");

  await page.goto(callbackUrl, { waitUntil: "domcontentloaded" });
  await expectAuthenticated(page);
  await page.goto(nextPath, { waitUntil: "domcontentloaded" });

  return email;
}

export async function expectAuthenticated(page: Page) {
  const response = await page.request.get("/api/auth/user");
  expect(response.ok()).toBeTruthy();
  const body = await response.json();

  expect(body.authenticated).toBe(true);
}

export async function checkFirstInputByValue(
  page: Page,
  selector: string,
  valueIncludes: string,
) {
  const inputs = page.locator(selector);
  const count = await inputs.count();

  for (let index = 0; index < count; index += 1) {
    const input = inputs.nth(index);
    const value = await input.getAttribute("value");

    if (value?.toLocaleLowerCase("tr").includes(valueIncludes.toLocaleLowerCase("tr"))) {
      await input.check({ force: true });
      return;
    }
  }

  await inputs.first().check({ force: true });
}

export async function fillStandardLocksmithRequest(page: Page) {
  const suffix = uniqueE2EValue("request");

  await page.goto("/request");
  await page.waitForLoadState("domcontentloaded");
  await expect(page.getByTestId("request-form")).toBeVisible();
  await expect(
    page.getByTestId("request-form").locator('button[type="submit"]'),
  ).toBeEnabled();
  // The form is server-rendered and controlled after hydration. Waiting here
  // prevents React from replacing values entered into the pre-hydration DOM.
  await page.waitForTimeout(750);
  await checkFirstInputByValue(page, 'input[name="serviceCategory"]', "çilingir");
  await page.locator('input[name="district"]').fill("Kadıköy");
  await page.locator('input[name="fullAddress"]').fill(`E2E adres ${suffix}`);
  await page.locator('input[name="urgencyLevel"][value="Bu hafta"]').check({ force: true });
  await page.locator('input[name="budgetTag"]').first().check({ force: true });
  await page.locator('input[name="paymentPreference"][value="cash"]').check({ force: true });
  await page.locator('input[name="preferredDate"]').fill("2026-07-01");
  await page.locator('select[name="preferredTimeRange"]').selectOption({ index: 1 });
  await page.locator('textarea[name="shortDescription"]').fill(`E2E çilingir talebi ${suffix}`);
  await page.locator('input[name="fullName"]').fill("E2E Müşteri");
  await page.locator('input[name="phoneNumber"]').fill("+90 555 000 01 01");
}

export async function submitStandardLocksmithRequest(page: Page) {
  await fillStandardLocksmithRequest(page);
  await page.getByTestId("request-form").locator('button[type="submit"]').click();
}
