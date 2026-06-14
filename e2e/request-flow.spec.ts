import { expect, test } from "@playwright/test";
import {
  loginWithPhoneOtp,
  skipUnlessLocalSupabase,
  submitStandardLocksmithRequest,
} from "./helpers";

test.describe("customer request flow", () => {
  test("authenticated customer submits a locksmith request", async ({ page }) => {
    skipUnlessLocalSupabase();

    await loginWithPhoneOtp(page);
    await submitStandardLocksmithRequest(page);

    await expect(page.getByTestId("request-success-card")).toBeVisible();
    await expect(page.getByTestId("request-success-code")).toContainText(/^FW-/);
    await expect(page.getByTestId("request-success-card")).toHaveClass(/trust-green-soft/);
  });
});
