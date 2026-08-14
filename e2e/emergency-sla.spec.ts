import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import {
  ensureTestUserRole,
  getTestAdminClient,
  loginWithEmailMagicLink,
  skipUnlessLocalSupabase,
  uniqueE2EEmail,
  uniqueE2EValue,
} from "./helpers";

test.describe("emergency response SLA", () => {
  test("provider sees countdown and admin sees breached SLA", async ({ browser }) => {
    skipUnlessLocalSupabase();

    const admin = getTestAdminClient();
    const providerEmail = uniqueE2EEmail("provider-sla");
    const adminEmail = uniqueE2EEmail("admin-sla");
    const customerEmail = uniqueE2EEmail("customer-sla");
    const providerUserId = await ensureTestUserRole(providerEmail, "provider");
    const adminUserId = await ensureTestUserRole(adminEmail, "admin");
    const customerUserId = await ensureTestUserRole(customerEmail, "customer");
    const requestId = randomUUID();
    const requestSuffix = uniqueE2EValue("sla");

    const { data: provider, error: providerError } = await admin
      .from("providers")
      .select("id, user_id, category_id, district_id")
      .eq("is_active", true)
      .eq("is_approved", true)
      .limit(1)
      .single();

    expect(providerError).toBeNull();
    expect(provider).toBeTruthy();

    if (!provider) {
      throw new Error("No active approved provider was available for SLA E2E setup.");
    }

    const previousProviderUserId = provider.user_id ?? null;

    try {
      const { error: providerUpdateError } = await admin
        .from("providers")
        .update({ user_id: providerUserId })
        .eq("id", provider.id);

      expect(providerUpdateError).toBeNull();

      const assignedAt = new Date().toISOString();
      const { error: requestInsertError } = await admin.from("service_requests").insert({
        address: `E2E SLA adres ${requestSuffix}`,
        approximate_location: "E2E SLA konum",
        assigned_at: assignedAt,
        assigned_provider_id: provider.id,
        budget_tag: "acil-hizmet",
        category_id: provider.category_id,
        confirmation_code: "123456",
        description: `E2E acil SLA talebi ${requestSuffix}`,
        district_id: provider.district_id,
        emergency_status: "assigned",
        estimated_arrival_text: "Yaklaşık 15 dakika",
        id: requestId,
        offered_price: 1500,
        payment_preference: "cash",
        status: "assigned",
        urgency: "urgent",
        urgency_type: "emergency",
        user_id: customerUserId,
      });

      expect(requestInsertError).toBeNull();

      const providerPage = await browser.newPage();
      await loginWithEmailMagicLink(providerPage, {
        email: providerEmail,
        nextPath: "/provider-dashboard/requests",
        role: "provider",
      });

      const countdown = providerPage.getByRole("status", {
        name: /SLA yanıt süresi kaldı/,
      });
      await expect(countdown).toBeVisible();
      await expect(countdown).toContainText(/\d{2}:\d{2}/);
      await providerPage.close();

      const breachedAssignedAt = new Date(Date.now() - 6 * 60 * 1000).toISOString();
      const { error: breachUpdateError } = await admin
        .from("service_requests")
        .update({ assigned_at: breachedAssignedAt })
        .eq("id", requestId);

      expect(breachUpdateError).toBeNull();

      const adminPage = await browser.newPage();
      await loginWithEmailMagicLink(adminPage, {
        email: adminEmail,
        nextPath: "/admin",
        role: "admin",
      });

      await expect(adminPage.getByText("SLA aşıldı")).toBeVisible();
      await adminPage.close();

      expect(adminUserId).toBeTruthy();
    } finally {
      await admin.from("service_requests").delete().eq("id", requestId);
      await admin
        .from("providers")
        .update({ user_id: previousProviderUserId })
        .eq("id", provider.id);
    }
  });
});
