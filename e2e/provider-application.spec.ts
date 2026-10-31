import { expect, test } from "./fixtures";
import { ensureTestUserRole, getTestAdminClient, loginWithEmailMagicLink, skipUnlessLocalSupabase, uniqueE2EEmail, uniqueE2EPhone } from "./helpers";

test.describe("provider application flow", () => {
  test("authenticated user submits provider application", async ({ page }) => {
    skipUnlessLocalSupabase();
    const phone = await uniqueE2EPhone();
    const email = uniqueE2EEmail("provider"), uid = await ensureTestUserRole(email, "customer");
    const admin = getTestAdminClient();
    const fixture = await admin.auth.admin.updateUserById(uid, { phone: phone!, phone_confirm: true });
    expect(fixture.error).toBeNull();
    await loginWithEmailMagicLink(page, { email });
    await page.goto("/provider-application");
    const form=page.getByRole("form", { name: "FUWU Partner başvurusu", exact: true });
    await expect(form).toBeVisible();
    await expect(form.getByRole("button",{name:"Başvurumu gönder",exact:true})).toBeEnabled();

    await form.getByRole('textbox',{name:'Ad soyad',exact:true}).fill("E2E Usta");
    await form.getByRole('combobox',{name:'Hizmet kategorisi',exact:true}).selectOption({ index: 1 });
    await form.getByRole('combobox',{name:'Çalışma ilçesi',exact:true}).selectOption({ index: 1 });
    await form
      .locator('input[name="phone"]')
      .fill(phone!);
    await form.getByRole("button", { name: "Telefonumu doğrula", exact: true }).click();
    await expect(form.getByRole("button", { name: "Telefon doğrulandı", exact: true })).toBeVisible();
    await expect(page.locator('input[name="experienceYears"]')).toHaveCount(0);
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
    await form.getByRole("button", { name: "Başvurumu gönder", exact: true }).click();
    await expect.poll(async () => (await admin.from("provider_applications").select("id").eq("user_id", uid)).data?.length).toBe(1);
  });
});
