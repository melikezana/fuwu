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

  test("cron reassigns breached emergency request and records live notifications", async ({ request }) => {
    skipUnlessLocalSupabase();
    test.skip(!process.env.CRON_SECRET, "CRON_SECRET is not configured.");

    const admin = getTestAdminClient();
    const oldProviderEmail = uniqueE2EEmail("provider-sla-old");
    const newProviderEmail = uniqueE2EEmail("provider-sla-new");
    const customerEmail = uniqueE2EEmail("customer-sla-cron");
    const oldProviderUserId = await ensureTestUserRole(oldProviderEmail, "provider");
    const newProviderUserId = await ensureTestUserRole(newProviderEmail, "provider");
    const customerUserId = await ensureTestUserRole(customerEmail, "customer");
    const requestId = randomUUID();
    const requestSuffix = uniqueE2EValue("sla-cron");

    const { data: providers, error: providersError } = await admin
      .from("providers")
      .select("id, user_id, category_id, district_id, is_active, is_approved")
      .eq("is_active", true)
      .eq("is_approved", true)
      .order("created_at", { ascending: true });

    expect(providersError).toBeNull();

    const providerPair = (providers ?? []).flatMap((provider, index, allProviders) => {
      const nextProvider = allProviders.find(
        (candidate, candidateIndex) =>
          candidateIndex > index && candidate.category_id === provider.category_id,
      );

      return nextProvider ? [[provider, nextProvider] as const] : [];
    })[0];

    if (!providerPair) {
      test.skip(true, "At least two active approved providers in one category are required.");
      return;
    }

    const [oldProvider, newProvider] = providerPair;
    const sameCategoryProviders = (providers ?? []).filter(
      (provider) => provider.category_id === oldProvider.category_id,
    );
    const previousProviderStates = new Map(
      sameCategoryProviders.map((provider) => [
        provider.id,
        {
          is_active: provider.is_active,
          is_approved: provider.is_approved,
          user_id: provider.user_id,
        },
      ]),
    );

    try {
      const providerUpdateResults = await Promise.all(
        sameCategoryProviders.map((provider) =>
          admin
            .from("providers")
            .update({
              is_active: provider.id === oldProvider.id || provider.id === newProvider.id,
              is_approved: provider.id === oldProvider.id || provider.id === newProvider.id,
              user_id:
                provider.id === oldProvider.id
                  ? oldProviderUserId
                  : provider.id === newProvider.id
                    ? newProviderUserId
                    : provider.user_id,
            })
            .eq("id", provider.id),
        ),
      );
      providerUpdateResults.forEach((result) => expect(result.error).toBeNull());

      const assignedAt = new Date().toISOString();
      const { error: requestInsertError } = await admin.from("service_requests").insert({
        address: `E2E cron SLA adres ${requestSuffix}`,
        approximate_location: "E2E cron SLA konum",
        assigned_at: assignedAt,
        assigned_provider_id: oldProvider.id,
        budget_tag: "acil-hizmet",
        category_id: oldProvider.category_id,
        confirmation_code: "123456",
        description: `E2E cron acil SLA talebi ${requestSuffix}`,
        district_id: oldProvider.district_id,
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

      const breachedAssignedAt = new Date(Date.now() - 6 * 60 * 1000).toISOString();
      const { error: breachUpdateError } = await admin
        .from("service_requests")
        .update({ assigned_at: breachedAssignedAt })
        .eq("id", requestId);

      expect(breachUpdateError).toBeNull();

      const cronResponse = await request.get("/api/cron/emergency-sla-sweep", {
        headers: {
          authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
      });

      expect(cronResponse.ok()).toBeTruthy();

      const { data: reassignedRequest, error: reassignedRequestError } = await admin
        .from("service_requests")
        .select("assigned_provider_id, status")
        .eq("id", requestId)
        .single();

      expect(reassignedRequestError).toBeNull();
      expect(reassignedRequest?.status).toBe("assigned");
      expect(reassignedRequest?.assigned_provider_id).toBe(newProvider.id);

      const { data: notifications, error: notificationsError } = await admin
        .from("notifications")
        .select("recipient_user_id, provider_id, event, body")
        .eq("request_id", requestId);

      expect(notificationsError).toBeNull();
      expect(notifications ?? []).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            body: "Bu talep süre aşımı nedeniyle başka bir ustaya yönlendirildi.",
            event: "emergency_request_reassigned_away",
            provider_id: oldProvider.id,
            recipient_user_id: oldProviderUserId,
          }),
          expect.objectContaining({
            event: "emergency_request_dispatched",
            provider_id: newProvider.id,
            recipient_user_id: newProviderUserId,
          }),
        ]),
      );

      const { data: reassignmentLog, error: reassignmentLogError } = await admin
        .from("request_reassignment_log")
        .select("is_dry_run, new_provider_id, previous_provider_id, reason")
        .eq("request_id", requestId)
        .eq("reason", "sla_breach_reassigned")
        .single();

      expect(reassignmentLogError).toBeNull();
      expect(reassignmentLog).toEqual(
        expect.objectContaining({
          is_dry_run: false,
          new_provider_id: newProvider.id,
          previous_provider_id: oldProvider.id,
          reason: "sla_breach_reassigned",
        }),
      );
    } finally {
      await admin.from("notifications").delete().eq("request_id", requestId);
      await admin.from("request_reassignment_log").delete().eq("request_id", requestId);
      await admin.from("service_requests").delete().eq("id", requestId);
      await Promise.all(
        Array.from(previousProviderStates.entries()).map(([providerId, providerState]) =>
          admin.from("providers").update(providerState).eq("id", providerId),
        ),
      );
    }
  });
});
