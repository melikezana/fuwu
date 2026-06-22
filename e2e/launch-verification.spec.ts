import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  ensureTestUserRole,
  getTestAdminClient,
  loginWithEmailMagicLink,
  skipUnlessLocalSupabase,
  submitStandardLocksmithRequest,
  uniqueE2EValue,
} from "./helpers";

const SEEDED_LOCKSMITH_PROVIDER_ID = "00000000-0000-4000-8000-000000000013";
const PNG_FIXTURE = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZfWQAAAAASUVORK5CYII=",
  "base64",
);

async function captureEvidence(page: Page, fileName: string) {
  if (process.env.E2E_CAPTURE_LAUNCH_EVIDENCE !== "true") {
    return;
  }

  await page.screenshot({
    fullPage: true,
    path: path.resolve("docs", "production", "evidence", fileName),
  });
}

test.describe("CTO launch verification", () => {
  test("filtered provider empty state preserves category and preselects the request", async ({
    page,
  }) => {
    skipUnlessLocalSupabase();

    await page.goto("/providers?category=cilingir&district=Adalar");
    await expect(page.locator('select[name="category"]')).toHaveValue("Çilingir");
    await expect(page.locator('select[name="district"]')).toHaveValue("Adalar");
    await expect(
      page.getByText("Bu bölgede henüz Çilingir ustası yok", { exact: true }),
    ).toBeVisible();

    const requestLink = page.locator(
      'a[href="/request?district=Adalar&service=cilingir"]',
    );
    await expect(requestLink).toHaveCount(1);
    await captureEvidence(page, "10-provider-empty-state.png");
    await requestLink.click();

    await expect(
      page.locator('input[name="serviceCategory"]:checked'),
    ).toHaveValue(/Çilingir/);
    await expect(page.locator('input[name="district"]')).toHaveValue("Adalar");
  });

  test("request, realtime, provider approval, assignment and acceptance work end to end", async ({
    browser,
  }) => {
    skipUnlessLocalSupabase();
    test.setTimeout(120_000);

    const suffix = uniqueE2EValue("launch");
    const customerEmail = `${suffix}-customer@fuwu.test`;
    const providerEmail = `${suffix}-provider@fuwu.test`;
    const adminEmail = `${suffix}-admin@fuwu.test`;
    const applicationName = `Launch Usta ${suffix}`;
    const applicationPhone = `+90 555 ${String(Date.now()).slice(-7)}`;
    const admin = getTestAdminClient();

    const [customerUserId, providerUserId] = await Promise.all([
      ensureTestUserRole(customerEmail, "customer"),
      ensureTestUserRole(providerEmail, "provider"),
      ensureTestUserRole(adminEmail, "admin"),
    ]);

    const { error: providerLinkError } = await admin
      .from("providers")
      .update({
        is_active: true,
        is_approved: true,
        user_id: providerUserId,
      })
      .eq("id", SEEDED_LOCKSMITH_PROVIDER_ID);

    expect(providerLinkError).toBeNull();

    const customerContext = await browser.newContext();
    const providerContext = await browser.newContext();
    const adminContext = await browser.newContext();
    const customerPage = await customerContext.newPage();
    const providerPage = await providerContext.newPage();
    const adminPage = await adminContext.newPage();
    const consoleErrors: string[] = [];
    const unexpectedHttpErrors: string[] = [];

    for (const page of [customerPage, providerPage, adminPage]) {
      page.on("console", (message) => {
        if (
          message.type() === "error" &&
          !message.text().startsWith("Failed to load resource:")
        ) {
          consoleErrors.push(message.text());
        }
      });
      page.on("pageerror", (error) => consoleErrors.push(error.message));
      page.on("response", (response) => {
        if (
          response.status() >= 400 &&
          !(
            response.status() === 401 &&
            new URL(response.url()).pathname === "/api/auth/user"
          )
        ) {
          unexpectedHttpErrors.push(`${response.status()} ${response.url()}`);
        }
      });
    }

    await loginWithEmailMagicLink(providerPage, {
      email: providerEmail,
      nextPath: "/provider-dashboard",
      role: "provider",
    });
    await providerPage.goto("/provider-dashboard");
    await expect(providerPage.getByRole("heading", { name: "Usta Paneli" })).toBeVisible();

    await loginWithEmailMagicLink(customerPage, {
      email: customerEmail,
      nextPath: "/request",
      role: "customer",
    });
    await submitStandardLocksmithRequest(customerPage);
    await expect(customerPage.getByTestId("request-success-card")).toBeVisible();
    await captureEvidence(customerPage, "03-customer-request-created.png");

    const { data: request, error: requestReadError } = await admin
      .from("service_requests")
      .select("id, status, category_id, district_id")
      .eq("user_id", customerUserId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    expect(requestReadError).toBeNull();
    expect(request).not.toBeNull();

    await expect
      .poll(async () => {
        const { count } = await admin
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("request_id", request!.id)
          .eq("recipient_user_id", providerUserId)
          .eq("event", "new_service_request_match");

        return count;
      })
      .toBe(1);

    await expect(
      providerPage.getByRole("button", { name: /okunmamış bildirim/i }),
    ).toBeVisible();
    await providerPage.getByRole("button", { name: /okunmamış bildirim/i }).click();
    await expect(providerPage.getByText("Yeni hizmet talebi", { exact: true })).toBeVisible();
    await captureEvidence(providerPage, "04-provider-realtime-notification.png");

    await customerPage.goto("/provider-application");
    await expect(customerPage.getByTestId("provider-application-form")).toBeVisible();
    await customerPage.waitForTimeout(750);
    const applicationForm = customerPage.getByTestId("provider-application-form");

    await applicationForm.locator('input[name="fullName"]').fill(applicationName);
    await applicationForm
      .locator('select[name="categoryId"]')
      .selectOption({ label: "Çilingir" });
    await applicationForm
      .locator('select[name="districtId"]')
      .selectOption({ label: "Kadıköy" });
    await applicationForm.locator('input[name="experienceYears"]').fill("8");
    await applicationForm.locator('input[name="availability"]').first().check({ force: true });
    await applicationForm
      .locator('input[name="hasEquipment"][value="true"]')
      .check({ force: true });
    await applicationForm
      .locator('textarea[name="introduction"]')
      .fill(`CTO launch verification provider application ${suffix}`);
    await applicationForm.locator('input[name="phone"]').fill(applicationPhone);
    await applicationForm.locator('input[name="profileImage"]').setInputFiles({
      buffer: PNG_FIXTURE,
      mimeType: "image/png",
      name: "profile.png",
    });
    await applicationForm.locator('input[name="verificationDocument"]').setInputFiles({
      buffer: PNG_FIXTURE,
      mimeType: "image/png",
      name: "verification.png",
    });
    await applicationForm.locator('button[type="submit"]').click();
    await expect(customerPage.getByTestId("provider-application-success")).toBeVisible();
    await captureEvidence(customerPage, "05-provider-application-submitted.png");

    const { data: application, error: applicationReadError } = await admin
      .from("provider_applications")
      .select("id, status, profile_image_path, verification_document_path")
      .eq("user_id", customerUserId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    expect(applicationReadError).toBeNull();
    expect(application?.profile_image_path).toBeTruthy();
    expect(application?.verification_document_path).toBeTruthy();

    await loginWithEmailMagicLink(adminPage, {
      email: adminEmail,
      nextPath: "/admin/provider-applications",
      role: "admin",
    });
    await adminPage.goto("/admin/provider-applications");
    const applicationRow = adminPage
      .locator("table:not(.hidden) tbody tr")
      .filter({ hasText: applicationName });
    await expect(applicationRow).toHaveCount(1);
    adminPage.once("dialog", (dialog) => dialog.accept());
    await applicationRow.getByRole("button", { name: "Onayla" }).click();

    await expect
      .poll(async () => {
        const { data } = await admin
          .from("provider_applications")
          .select("status")
          .eq("id", application!.id)
          .single();

        return data?.status;
      })
      .toBe("approved");

    const { data: approvedProvider, error: approvedProviderError } = await admin
      .from("providers")
      .select("id, user_id, is_active, is_approved")
      .eq("user_id", customerUserId)
      .single();

    expect(approvedProviderError).toBeNull();
    expect(approvedProvider).toMatchObject({
      is_active: true,
      is_approved: true,
      user_id: customerUserId,
    });
    await captureEvidence(adminPage, "06-admin-provider-approved.png");

    await adminPage.goto("/admin/service-requests");
    const requestRow = adminPage
      .locator("table:not(.hidden) tbody tr")
      .filter({ hasText: request!.id });
    await expect(requestRow).toHaveCount(1);
    await requestRow
      .locator('select[name="providerId"]')
      .selectOption(SEEDED_LOCKSMITH_PROVIDER_ID);
    await requestRow.getByRole("button", { name: "Ustaya Ata" }).click();

    await expect
      .poll(async () => {
        const { data } = await admin
          .from("service_requests")
          .select("status, assigned_provider_id")
          .eq("id", request!.id)
          .single();

        return data;
      })
      .toMatchObject({
        assigned_provider_id: SEEDED_LOCKSMITH_PROVIDER_ID,
        status: "assigned",
      });
    await captureEvidence(adminPage, "07-admin-request-assigned.png");

    await providerPage.goto("/provider-dashboard/requests");
    const providerRequestCard = providerPage
      .locator("article:visible")
      .filter({ hasText: request!.id });
    await expect(providerRequestCard).toHaveCount(1);
    await providerRequestCard.getByRole("button", { name: "Kabul Et" }).click();

    await expect
      .poll(async () => {
        const { data } = await admin
          .from("service_requests")
          .select("status")
          .eq("id", request!.id)
          .single();

        return data?.status;
      })
      .toBe("accepted");
    await captureEvidence(providerPage, "08-provider-request-accepted.png");

    await customerPage.goto(`/account/requests?requestId=${request!.id}`);
    const customerRequestCard = customerPage
      .locator("article")
      .filter({ hasText: "Usta talebini kabul etti." });
    await expect(customerRequestCard).toHaveCount(1);
    await expect(
      customerRequestCard.getByText("Usta talebini kabul etti.", { exact: true }),
    ).toBeVisible();
    await captureEvidence(customerPage, "09-customer-sees-accepted-status.png");

    expect(consoleErrors).toEqual([]);
    expect(unexpectedHttpErrors).toEqual([]);

    await Promise.all([
      customerContext.close(),
      providerContext.close(),
      adminContext.close(),
    ]);
  });
});
