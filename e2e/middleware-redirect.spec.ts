import { expect, test } from "@playwright/test";

const protectedRoutes = ["/admin", "/provider-dashboard", "/account", "/dashboard"];

test.describe("middleware redirects", () => {
  for (const route of protectedRoutes) {
    test(`unauthenticated user visiting ${route} is redirected to login`, async ({ page }) => {
      await page.context().clearCookies();
      await page.goto(route);

      await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(route)}`));
    });
  }
});
