import { expect, type Page, test } from "@playwright/test";

const isLocalSupabaseUrl = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/^https?:\/\/(127\.0\.0\.1|localhost)/),
);
const allowsRemoteTestProject = process.env.E2E_ALLOW_REMOTE_SUPABASE_TESTS === "true";

export const hasLocalSupabaseE2E = Boolean(
  (isLocalSupabaseUrl || allowsRemoteTestProject) && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export function skipUnlessLocalSupabase() {
  test.skip(!hasLocalSupabaseE2E, "Local Supabase test env is not configured.");
}

export function uniqueE2EValue(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
}

export async function loginWithPhoneOtp(page: Page) {
  skipUnlessLocalSupabase();

  const phone = process.env.E2E_CUSTOMER_PHONE;
  const otp = process.env.E2E_CUSTOMER_OTP;

  test.skip(!phone || !otp, "E2E phone credentials are not configured.");

  await page.goto("/login");
  await page.getByTestId("login-phone-input").fill(phone!);
  await page.getByRole("button", { name: /kod/i }).click();
  await page.getByTestId("login-otp-input").fill(otp!);
  await page.getByRole("button", { name: /giriş|giris/i }).click();
  await page.waitForLoadState("networkidle");
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
  await expect(page.getByTestId("request-form")).toBeVisible();
  await checkFirstInputByValue(page, 'input[name="serviceCategory"]', "çilingir");
  await page.locator('select[name="district"]').selectOption({ index: 1 });
  await page.locator('input[name="fullAddress"]').fill(`E2E adres ${suffix}`);
  await page.locator('input[name="budgetTag"]').first().check({ force: true });
  await page.locator('input[name="paymentPreference"][value="cash"]').check({ force: true });
  await page.locator('input[name="preferredDate"]').fill("2026-06-20");
  await page.locator('select[name="preferredTimeRange"]').selectOption({ index: 1 });
  await page.locator('textarea[name="shortDescription"]').fill(`E2E çilingir talebi ${suffix}`);
  await page.locator('input[name="fullName"]').fill("E2E Müşteri");
  await page.locator('input[name="phoneNumber"]').fill("+90 555 000 01 01");
}

export async function submitStandardLocksmithRequest(page: Page) {
  await fillStandardLocksmithRequest(page);
  await page.getByTestId("request-form").locator('button[type="submit"]').click();
}
