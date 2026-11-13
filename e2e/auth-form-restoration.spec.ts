import { expect, test } from "./fixtures";
import { setCheckboxReliably } from "./helpers";

test.describe("auth-required form restoration", () => {
  test("guest account return retains selected view", async ({ page }) => {
    await page.goto("/account?view=favorites");
    await expect(page).toHaveURL(url => url.pathname === "/login" && url.searchParams.get("next") === "/account?view=favorites");
  });

  test("guest provider application preserves text but not file references", async ({
    page,
  }) => {
    await page.goto("/provider-application");
    await page.waitForLoadState("domcontentloaded");
    const form=page.getByRole("form", { name: "FUWU Partner başvurusu", exact: true });
    await expect(form).toBeVisible();
    await expect(
      form.getByRole('button',{name:'Başvurumu gönder',exact:true}),
    ).toBeEnabled();
    await form.getByRole('textbox',{name:'Ad soyad',exact:true}).fill("E2E Usta Adayı");
    await form.getByRole('combobox',{name:'Hizmet kategorisi',exact:true}).selectOption({ index: 1 });
    await form.getByRole('combobox',{name:'Çalışma ilçesi',exact:true}).selectOption({ index: 1 });
    await form.getByRole('textbox',{name:'Cep telefonu',exact:true}).fill("+90 555 700 00 01");
    await expect(form.getByRole('textbox',{name:'Ad soyad',exact:true})).toHaveValue("E2E Usta Adayı");
    await expect(form.getByRole('combobox',{name:'Hizmet kategorisi',exact:true})).not.toHaveValue("");
    await expect(form.getByRole('combobox',{name:'Çalışma ilçesi',exact:true})).not.toHaveValue("");
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
    // Giriş yapmamış aday formun nasıl gönderileceğini önceden görür.
    await expect(page.getByTestId('provider-application-guest-note')).toBeVisible();
    await setCheckboxReliably(form.getByRole('checkbox',{name:'Başvuru aydınlatma metnini okudum, bilgi edindim.',exact:true}),true);
    await form.getByRole('button',{name:'Başvurumu gönder',exact:true}).click();

    await expect(page).toHaveURL(/\/login\?method=phone&next=\/provider-application&restore=1/);
    // Usta başvurusundan gelen giriş telefon sekmesiyle açılır ve formdaki numara taşınır.
    await expect(page.getByTestId("login-phone-input")).toHaveValue("+90 555 700 00 01");
    const storedApplication = await page.evaluate(() =>
      window.sessionStorage.getItem("fuwu:pending-provider-application"),
    );

    expect(storedApplication).toContain("E2E Usta Adayı");
    expect(storedApplication).not.toContain("verificationDocumentPath");
    expect(storedApplication).not.toContain("profileImagePath");
    await page.goto("/provider-application");
    await expect(form.getByRole('textbox',{name:'Ad soyad',exact:true})).toHaveValue("E2E Usta Adayı");
    await expect(form.getByRole('textbox',{name:'Cep telefonu',exact:true})).toHaveValue("+90 555 700 00 01");
  });

  test("legacy purchase link preserves the provider without opening the retired form", async ({ page }) => {
    await page.goto("/request?provider_id=30000000-0000-4000-8000-000000000099");
    await expect(page).toHaveURL(/\/providers\/30000000-0000-4000-8000-000000000099#provider-services$/);
    await expect(page.getByTestId("request-form")).toHaveCount(0);
  });
});
