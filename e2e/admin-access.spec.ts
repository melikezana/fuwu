import { expect, test } from "./fixtures";
import { loginWithEmailMagicLink, skipUnlessLocalSupabase } from "./helpers";

test.describe("admin access", () => {
  test("non-admin session is redirected away from admin", async ({ page }) => {
    skipUnlessLocalSupabase();

    await loginWithEmailMagicLink(page);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "İşlerin burada.", exact: true })).toBeVisible();
  });

  test("admin session can see dashboard shell", async ({ page }) => {
    skipUnlessLocalSupabase();

    await loginWithEmailMagicLink(page, {
      nextPath: "/admin",
      role: "admin",
    });
    await expect(page.getByRole("heading", { name: "İşler kontrol altında.", exact: true })).toBeVisible();
  });
});
