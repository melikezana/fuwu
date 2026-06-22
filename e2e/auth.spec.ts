import { expect, test } from "@playwright/test";
import { expectAuthenticated, loginWithEmailMagicLink, skipUnlessLocalSupabase } from "./helpers";

test.describe("auth flow", () => {
  test("email magic-link login creates a session", async ({ page }) => {
    skipUnlessLocalSupabase();

    await loginWithEmailMagicLink(page);
    await expectAuthenticated(page);
    await expect(page.getByTestId("login-options")).toBeHidden({ timeout: 15_000 });
  });
});
