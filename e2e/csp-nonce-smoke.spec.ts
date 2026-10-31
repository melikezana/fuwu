import { expect, test, type Page, type Response } from "./fixtures";
import { createTrustFixture, loginWithEmailMagicLink, skipUnlessLocalSupabase, uniqueE2EEmail } from "./helpers";

const cspViolationPattern =
  /Content Security Policy|Refused to execute inline script|Refused to load .*violates|violates the following Content Security Policy directive/i;
const requireStrictNonce =
  process.env.CSP_SMOKE_REQUIRE_STRICT_NONCE !== "false";
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

  test("service purchase loads without CSP console violations", async ({ page }) => {
    await gotoAndExpectNoCspViolations(page, "/services/musluk-montaji");
    await expect(page.getByRole("heading", { level: 1, name: "Musluk montajı" })).toBeVisible();
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

  test("authenticated admin panel has no CSP console violations", async ({page}) => {
    skipUnlessLocalSupabase();
    const violations=collectCspViolations(page);
    await loginWithEmailMagicLink(page,{email:uniqueE2EEmail("csp-admin"),role:"admin",nextPath:"/admin"});
    await gotoAndExpectNoCspViolations(page,"/admin",violations);
    await expect(page.getByRole("heading",{name:"İşler kontrol altında.",exact:true})).toBeVisible();
  });
  test("synthetic order confirmation screen has no CSP console violations", async ({page}) => {
    skipUnlessLocalSupabase();
    const fixture=await createTrustFixture();
    const violations=collectCspViolations(page);
    await loginWithEmailMagicLink(page,{email:fixture.email,nextPath:"/orders/"+fixture.id});
    await gotoAndExpectNoCspViolations(page,"/orders/"+fixture.id,violations);
    await expect(page.getByRole("heading",{name:"E2E Synthetic Trust Appointment",exact:true})).toBeVisible();
  });
});
