import { expect, test } from "@playwright/test";
import { loginWithPhoneOtp, skipUnlessLocalSupabase } from "./helpers";

test.describe("admin access", () => {
  test("non-admin session sees AdminAccessGate", async ({ page }) => {
    skipUnlessLocalSupabase();

    await loginWithPhoneOtp(page);
    await page.goto("/admin");
    await expect(page.getByTestId("admin-access-gate")).toBeVisible();
    await expect(page.getByText(/admin/i)).toBeVisible();
  });

  test("admin session can see dashboard shell", async ({ page }) => {
    skipUnlessLocalSupabase();
    test.skip(!process.env.E2E_ADMIN_EMAIL, "Admin e2e identity is not configured.");

    await page.goto("/admin");
    await expect(page.getByText(/Admin|Yönetim|Talepler/i)).toBeVisible();
  });
});
