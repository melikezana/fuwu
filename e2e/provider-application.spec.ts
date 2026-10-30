import { expect, test } from "@playwright/test";
import { ensureTestUserRole, getTestAdminClient, loginWithEmailMagicLink, skipUnlessLocalSupabase, uniqueE2EEmail } from "./helpers";

test.describe("provider application flow", () => {
  test("authenticated user submits provider application", async ({ page }) => {
    skipUnlessLocalSupabase();
    const phone = process.env.E2E_PROVIDER_TEST_PHONE;
    test.skip(!phone || !/^\+90\d{10}$/.test(phone), "Dedicated isolated Auth test phone required; real SMS verification is a separate gate");
    const email = uniqueE2EEmail("provider"), uid = await ensureTestUserRole(email, "customer");
    const admin = getTestAdminClient();
    const fixture = await admin.auth.admin.updateUserById(uid, { phone: phone!, phone_confirm: true });
    expect(fixture.error).toBeNull();
    await loginWithEmailMagicLink(page, { email });
    await page.goto("/provider-application");
    await expect(page.getByTestId("provider-application-form")).toBeVisible();

    await page.locator('input[name="fullName"]').fill("E2E Usta");
    await page.locator('select[name="categoryId"]').selectOption({ index: 1 });
    await page.locator('select[name="districtId"]').selectOption({ index: 1 });
    await page
      .locator('input[name="phone"]')
      .fill(phone!);
    await page.getByRole("button", { name: "Telefonumu doğrula", exact: true }).click();
    await expect(page.getByRole("button", { name: "Telefon doğrulandı", exact: true })).toBeVisible();
    await expect(page.locator('input[name="experienceYears"]')).toHaveCount(0);
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
    await page.getByRole("button", { name: "Başvurumu gönder", exact: true }).click();
    await expect.poll(async () => (await admin.from("provider_applications").select("id").eq("user_id", uid)).data?.length).toBe(1);
  });
});
