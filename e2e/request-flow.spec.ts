import { expect, test } from "@playwright/test";
import {
  loginWithEmailMagicLink,
  skipUnlessLocalSupabase,
  submitStandardLocksmithRequest,
} from "./helpers";

test.describe("customer request flow", () => {
  test("authenticated customer submits a locksmith request", async ({ page }) => {
    skipUnlessLocalSupabase();

    await loginWithEmailMagicLink(page);
    await submitStandardLocksmithRequest(page);

    await expect(page).toHaveURL(/\/order-tracking\/[0-9a-f-]{36}$/);
    await expect(page.getByText("Order Tracking")).toBeVisible();
    await expect(page.getByText("6 haneli kod")).toBeVisible();
  });
});
