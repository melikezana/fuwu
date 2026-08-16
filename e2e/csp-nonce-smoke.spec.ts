import { expect, test, type Page, type Response } from "@playwright/test";

const cspViolationPattern =
  /Content Security Policy|Refused to execute inline script|Refused to load .*violates|violates the following Content Security Policy directive/i;
const requireStrictNonce =
  process.env.CSP_SMOKE_REQUIRE_STRICT_NONCE !== "false";
const productionPaymentRequestId =
  process.env.E2E_PAYMENT_CONFIRMATION_REQUEST_ID?.trim() ?? "";
const adminStorageState = process.env.E2E_ADMIN_STORAGE_STATE?.trim() ?? "";

function collectCspViolations(page: Page) {
  const violations: string[] = [];

  page.on("console", (message) => {
    const text = message.text();

    if (message.type() === "error" && cspViolationPattern.test(text)) {
      violations.push(text);
    }
  });
  page.on("pageerror", (error) => {
    const text = error.message;

    if (cspViolationPattern.test(text)) {
      violations.push(text);
    }
  });

  return violations;
}

function expectStrictNonceCsp(response: Response | null) {
  if (!requireStrictNonce) {
    return;
  }

  const csp = response?.headers()["content-security-policy"] ?? "";

  expect(csp, "response should include a Content-Security-Policy header").toContain(
    "script-src",
  );
  expect(csp, "script-src should include a request nonce").toMatch(
    /script-src[^;]*'nonce-[^']+'/,
  );
  expect(csp, "script-src should not rely on unsafe-inline").not.toMatch(
    /script-src[^;]*'unsafe-inline'/,
  );
}

async function gotoAndExpectNoCspViolations(
  page: Page,
  path: string,
  violations = collectCspViolations(page),
) {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });

  await page.waitForTimeout(1500);
  expectStrictNonceCsp(response);
  expect(violations, `CSP console violations on ${path}`).toEqual([]);

  return response;
}

test.describe("CSP nonce smoke", () => {
  test("home page loads without CSP console violations", async ({ page }) => {
    await gotoAndExpectNoCspViolations(page, "/");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Google login entry loads without CSP console violations", async ({ page }) => {
    await gotoAndExpectNoCspViolations(page, "/login");
    await expect(page.getByTestId("login-options")).toBeVisible();
    await expect(page.getByRole("button", { name: /Google/i })).toBeVisible();
  });

  test("request form loads without CSP console violations", async ({ page }) => {
    await gotoAndExpectNoCspViolations(page, "/request");
    await expect(page.getByTestId("request-form")).toBeVisible();
  });

  test("AI assistant photo upload path has no CSP console violations", async ({ page }) => {
    const violations = collectCspViolations(page);

    await gotoAndExpectNoCspViolations(page, "/", violations);
    await page
      .getByRole("button", { name: /Fuwu Akıllı Asistan destek panelini aç/i })
      .click();
    await page.getByRole("button", { name: /Akıllı Asistanı Aç/i }).click();

    const pngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
      "base64",
    );

    await page
      .locator(
        'input[accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"]',
      )
      .setInputFiles({
        buffer: pngBuffer,
        mimeType: "image/png",
        name: "csp-smoke.png",
      });
    await expect(
      page.getByAltText("Yüklenen sorun fotoğrafı önizlemesi"),
    ).toBeVisible();
    expect(violations, "CSP console violations after assistant image upload").toEqual(
      [],
    );
  });

  test("admin route does not emit CSP console violations before auth", async ({ page }) => {
    await gotoAndExpectNoCspViolations(page, "/admin");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin|\/admin/);
  });

  test("authenticated admin panel has no CSP console violations", async ({
    browser,
  }, testInfo) => {
    test.skip(
      !adminStorageState,
      "Set E2E_ADMIN_STORAGE_STATE to smoke the authenticated production admin panel.",
    );

    const context = await browser.newContext({
      baseURL: testInfo.project.use.baseURL as string | undefined,
      storageState: adminStorageState,
    });
    const page = await context.newPage();

    try {
      await gotoAndExpectNoCspViolations(page, "/admin");
      await expect(page.getByRole("heading", { name: "Admin Paneli" })).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test("payment confirmation screen has no CSP console violations", async ({
    page,
  }) => {
    test.skip(
      !productionPaymentRequestId,
      "Set E2E_PAYMENT_CONFIRMATION_REQUEST_ID to smoke a real payment confirmation screen.",
    );

    await gotoAndExpectNoCspViolations(
      page,
      `/order-tracking/${productionPaymentRequestId}`,
    );
    await expect(page.getByText(/Ödeme|onay|takip/i).first()).toBeVisible();
  });
});
