import { expect, test } from "@playwright/test";
import {
  loginWithPhoneOtp,
  skipUnlessLocalSupabase,
  submitStandardLocksmithRequest,
} from "./helpers";

test.describe("duplicate request guard", () => {
  test("same active category and district shows duplicate message", async ({ page }) => {
    skipUnlessLocalSupabase();

    await loginWithPhoneOtp(page);
    await submitStandardLocksmithRequest(page);
    await expect(page.getByTestId("request-success-card")).toBeVisible();

    await submitStandardLocksmithRequest(page);
    await expect(page.getByRole("alert")).toContainText(/halihazırda|zaten/i);
  });
});
