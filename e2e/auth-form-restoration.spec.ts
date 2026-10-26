import { expect, test } from "@playwright/test";
import {
  uniqueE2EValue,
} from "./helpers";

test.describe("auth-required form restoration", () => {
  test("guest account return retains selected view", async ({ page }) => {
    await page.goto("/account?view=favorites");
    await expect(page).toHaveURL(url => url.pathname === "/login" && url.searchParams.get("next") === "/account?view=favorites");
  });

  test("guest provider application preserves text but not file references", async ({
    page,
  }) => {
    await page.goto("/provider-application");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("provider-application-form")).toBeVisible();
    await expect(
      page.getByTestId("provider-application-form").locator('button[type="submit"]'),
    ).toBeEnabled();
    // The page is server-rendered; allow the controlled client form to hydrate
    // before filling fields so React does not replace pre-hydration values.
    await page.waitForTimeout(750);

    await page.locator('input[name="fullName"]').fill("E2E Usta Adayı");
    await page.locator('select[name="categoryId"]').selectOption({ index: 1 });
    await page.locator('select[name="districtId"]').selectOption({ index: 1 });
    await page.locator('input[name="experienceYears"]').fill("5");
    const availabilityInput = page.locator(
      'input[name="availability"][value="Tam zamanlı"]',
    );
    await page
      .locator('label:has(input[name="availability"][value="Tam zamanlı"])')
      .click();
    await expect(availabilityInput).toBeChecked();
    const equipmentInput = page.locator('input[name="hasEquipment"][value="true"]');
    await page.locator('label:has(input[name="hasEquipment"][value="true"])').click();
    await expect(equipmentInput).toBeChecked();
    await page
      .locator('textarea[name="introduction"]')
      .fill(`Korunacak başvuru ${uniqueE2EValue("provider-restore")}`);
    await page.locator('input[name="phone"]').fill("+90 555 700 00 01");
    await expect(page.locator('input[name="fullName"]')).toHaveValue("E2E Usta Adayı");
    await expect(page.locator('select[name="categoryId"]')).not.toHaveValue("");
    await expect(page.locator('select[name="districtId"]')).not.toHaveValue("");
    await expect(page.locator('input[name="experienceYears"]')).toHaveValue("5");
    await page.getByTestId("provider-application-form").locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/login\?next=\/provider-application&restore=1/);
    const storedApplication = await page.evaluate(() =>
      window.sessionStorage.getItem("fuwu:pending-provider-application"),
    );

    expect(storedApplication).toContain("E2E Usta Adayı");
    expect(storedApplication).not.toContain("verificationDocumentPath");
    expect(storedApplication).not.toContain("profileImagePath");
  });

  test("legacy purchase link preserves the provider without opening the retired form", async ({ page }) => {
    await page.goto("/request?provider_id=30000000-0000-4000-8000-000000000099");
    await expect(page).toHaveURL(/\/providers\/30000000-0000-4000-8000-000000000099#provider-services$/);
    await expect(page.getByTestId("request-form")).toHaveCount(0);
  });
});
