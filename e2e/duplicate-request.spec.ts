import { expect, test } from "@playwright/test";
import {
  loginWithEmailMagicLink,
  skipUnlessLocalSupabase,
  submitStandardLocksmithRequest,
} from "./helpers";

test.describe("duplicate request guard", () => {
  test("same active category and district shows duplicate message", async ({ page }) => {
    skipUnlessLocalSupabase();

    await loginWithEmailMagicLink(page);
    await submitStandardLocksmithRequest(page);
    await expect(page.getByTestId("request-success-card")).toBeVisible();

    await submitStandardLocksmithRequest(page);
    await expect(
      page.getByRole("alert").filter({ hasText: /halihazırda|zaten/i }),
    ).toBeVisible();
  });
});
