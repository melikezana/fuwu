import { expect, test } from "@playwright/test";

test.describe("direct purchase entry", () => {
  test("legacy links retain category and district in the service catalog", async ({ page }) => {
    await page.goto("/request?service=tesisat&district=Kad%C4%B1k%C3%B6y&offer_amount=1");
    await expect(page).toHaveURL(url => url.pathname === "/services" && url.searchParams.get("category") === "tesisat" && url.searchParams.get("district") === "Kadıköy" && !url.searchParams.has("offer_amount"));
    await expect(page.getByTestId("request-form")).toHaveCount(0);
  });
  test("home offers direct purchasing and provider onboarding", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Hizmet Satın Al", exact: true })).toBeVisible();
    await expect(page.locator('.home-secondary-actions a[href="/provider-application"]')).toBeVisible();
    await expect(page.locator("canvas")).toHaveCount(0);
  });
});
