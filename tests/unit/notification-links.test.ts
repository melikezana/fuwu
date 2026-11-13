import { describe, expect, it } from "vitest";
import { notificationHref } from "@/lib/notifications/links";

const id = "ac000000-0000-4000-8000-000000000001";

describe("notification links", () => {
  it("opens the related page for each kind of notification", () => {
    expect(notificationHref({ entity_type: "order", entity_id: id })).toBe(`/orders/${id}`);
    expect(notificationHref({ entity_type: "provider_application", metadata: { url: `/admin/provider-applications/${id}` } })).toBe(`/admin/provider-applications/${id}`);
    expect(notificationHref({ entity_type: "provider_application", metadata: { url: "/account/applications" } })).toBe("/account/applications");
    expect(notificationHref({ entity_type: "launch_interest", metadata: { url: "/admin/interest" } })).toBe("/admin/interest");
    expect(notificationHref({ entity_type: "service_request", event: "new_service_request_match" })).toBe("/provider-dashboard/requests");
    expect(notificationHref({ entity_type: "service_request", request_id: id })).toBe(`/order-tracking/${id}`);
    expect(notificationHref({ entity_type: "provider_application" })).toBe("/account/applications");
  });

  it("never follows an outside or malformed address from the database", () => {
    for (const url of ["https://evil.example", "//evil.example", "/admin//evil", "javascript:alert(1)", "/unknown/page", 42])
      expect(notificationHref({ entity_type: "support_message", metadata: { url } })).toBeNull();
  });
});
