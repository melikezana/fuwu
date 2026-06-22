import { expect, test } from "@playwright/test";
import { loginWithEmailMagicLink, skipUnlessLocalSupabase, uniqueE2EValue } from "./helpers";

test.describe("provider application flow", () => {
  test("authenticated user submits provider application", async ({ page }) => {
    skipUnlessLocalSupabase();
    const suffix = uniqueE2EValue("provider");

    await loginWithEmailMagicLink(page);
    await page.goto("/provider-application");
    await expect(page.getByTestId("provider-application-form")).toBeVisible();
    await page.waitForTimeout(750);

    await page.locator('input[name="fullName"]').fill("E2E Usta");
    await page.locator('select[name="categoryId"]').selectOption({ index: 1 });
    await page.locator('select[name="districtId"]').selectOption({ index: 1 });
    await page.locator('input[name="experienceYears"]').fill("7");
    await page.locator('input[name="availability"]').first().check({ force: true });
    await page.locator('input[name="hasEquipment"][value="true"]').check({ force: true });
    await page
      .locator('textarea[name="introduction"]')
      .fill(`E2E provider application ${suffix}`);
    await page
      .locator('input[name="phone"]')
      .fill(`+90 555 ${String(Date.now()).slice(-7)}`);
    await page.getByTestId("provider-application-form").locator('button[type="submit"]').click();

    await expect(page.getByTestId("provider-application-success")).toBeVisible();
  });
});
