import { expect, test } from "@playwright/test";
import { loginWithEmailMagicLink, skipUnlessLocalSupabase } from "./helpers";

test.describe("admin access", () => {
  test("non-admin session sees AdminAccessGate", async ({ page }) => {
    skipUnlessLocalSupabase();

    await loginWithEmailMagicLink(page);
    await page.goto("/admin");
    await expect(page.getByTestId("admin-access-gate")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Admin paneline erişim" })).toBeVisible();
  });

  test("admin session can see dashboard shell", async ({ page }) => {
    skipUnlessLocalSupabase();

    await loginWithEmailMagicLink(page, {
      nextPath: "/admin",
      role: "admin",
    });
    await expect(page.getByRole("heading", { name: "Admin Paneli" })).toBeVisible();
  });
});
