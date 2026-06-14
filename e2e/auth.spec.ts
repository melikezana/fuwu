import { expect, test } from "@playwright/test";
import { expectAuthenticated, loginWithPhoneOtp, skipUnlessLocalSupabase } from "./helpers";

test.describe("auth flow", () => {
  test("phone OTP login creates a session", async ({ page }) => {
    skipUnlessLocalSupabase();

    await loginWithPhoneOtp(page);
    await expectAuthenticated(page);
    await expect(page.getByTestId("login-options")).toBeHidden({ timeout: 15_000 });
  });
});
