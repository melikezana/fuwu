import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { historyStatuses, isHoldExpired, isOrderOverdue, serviceActiveStatuses, trackingStatuses } from "../src/lib/commerce/order-state";
import { reconciliationReasons } from "../src/lib/commerce/reconciliation-state";
import { validateReviewInput } from "../src/lib/validations/reviewSchemas";
import type { CommerceOrder, OrderStatus } from "../src/lib/commerce/types";
import { createContentSecurityPolicyHeaderValue } from "../src/lib/security/securityHeaders";

const checks: string[] = [];
function check(name: string, run: () => void) { run(); checks.push(name); console.log("PASS " + name); }
const now = Date.parse("2026-10-23T12:00:00+03:00");
const order = { status: "IN_PROGRESS", ends_at: "2026-10-23T10:00:00+03:00", expires_at: "2026-10-23T09:00:00+03:00", payment_status: "PAID" } as CommerceOrder;
check("Overdue uncompleted services stay active in both customer and provider state sets", () => {
  for (const status of serviceActiveStatuses) { assert.ok(trackingStatuses.includes(status)); assert.ok(isOrderOverdue({ ...order, status }, now)); }
  for (const status of historyStatuses) assert.ok(!isOrderOverdue({ ...order, status }, now));
});
check("Every supported order status belongs to exactly one tracking/history view", () => {
  const statuses: OrderStatus[] = ["PENDING_PAYMENT", "CONFIRMED", "PROVIDER_ON_THE_WAY", "IN_PROGRESS", "COMPLETED", "CANCELLED", "PAYMENT_FAILED", "REFUND_PENDING", "REFUNDED", "DISPUTED"];
  for (const status of statuses) assert.equal(Number(trackingStatuses.includes(status)) + Number(historyStatuses.includes(status)), 1);
});
check("Hold expiry does not masquerade as server cancellation or completed service", () => {
  assert.equal(isHoldExpired({ ...order, status: "PENDING_PAYMENT" }, now), true);
  assert.equal(isHoldExpired(order, now), false); assert.equal(isHoldExpired({ ...order, status: "CANCELLED" }, now), false);
});
check("Review validation rejects fractions, missing text, oversized comments and invalid scores", () => {
  for (const input of [{ rating: 1.5, comment: "TEST değerlendirme" }, { rating: 6, comment: "TEST değerlendirme" }, { rating: 4, comment: "x".repeat(1001) }, { rating: 4, comment: null }]) assert.equal(validateReviewInput(input as { rating: number; comment: string }).ok, false);
  assert.equal(validateReviewInput({ rating: 4, comment: "TEST gerçek hizmet değerlendirmesi" }).ok, true);
});
check("Reconciliation explains missing verification, incomplete initialization and expired checkout", () => {
  assert.ok(reconciliationReasons(order, null, now).some(r => r.includes("doğrulanmış")));
  const transaction = { status: "INITIALIZING", payout_state: "NONE", refund_state: "NONE", created_at: "2026-10-23T11:50:00+03:00" };
  assert.ok(reconciliationReasons(order, transaction, now).some(r => r.includes("beş dakika")));
  assert.ok(reconciliationReasons(order, { ...transaction, status: "AWAITING" }, now).some(r => r.includes("Rezervasyon süresi")));
});
check("IN_FLIGHT and missing item identity require reconciliation and never claim completion", () => {
  const transaction = { status: "SUCCEEDED", payout_state: "IN_FLIGHT", refund_state: "NONE", created_at: "2026-10-23T11:50:00+03:00", has_item_transaction: false };
  const reasons = reconciliationReasons(order, transaction, now);
  assert.ok(reasons.some(r => r.includes("yeniden göndermeyin"))); assert.ok(reasons.some(r => r.includes("kalem işlem kimliği")));
});
check("Verified consistent payment has no false reconciliation alert", () => {
  assert.deepEqual(reconciliationReasons(order, { status: "SUCCEEDED", payout_state: "RELEASED", refund_state: "NONE", created_at: "2026-10-23T11:50:00+03:00", has_item_transaction: true }, now), []);
});
check("Local WebKit can load HTTP assets while remote origins retain strict CSP/HTTPS upgrades", () => {
  for (const origin of ["http://127.0.0.1:3067", "http://localhost:3067", "http://[::1]:3067"]) {
    const policy = createContentSecurityPolicyHeaderValue("test-nonce", origin);
    assert.ok(!policy.includes("upgrade-insecure-requests")); assert.ok(policy.includes("'nonce-test-nonce'")); assert.ok(policy.includes("'strict-dynamic'"));
  }
  for (const origin of [undefined, "https://www.fuwu.com.tr", "http://example.test", "http://localhost.evil.test", "invalid"]) assert.ok(createContentSecurityPolicyHeaderValue("test-nonce", origin).includes("upgrade-insecure-requests"));
});
mkdirSync("artifacts/fusion-quality", { recursive: true });
writeFileSync("artifacts/fusion-quality/logic-tests.json", JSON.stringify({ scope: "Offline logic regression checks", checks }, null, 2));
