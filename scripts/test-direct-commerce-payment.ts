import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
import { assertSandbox, sandboxPaymentUrl, verifyCommercePayment } from "../src/lib/commerce/payment";
import type { CommerceOrder } from "../src/lib/commerce/types";
import type { RetrieveIyzicoCheckoutResponse } from "../src/services/payments/iyzico-checkout";
import { retrieveIyzicoCheckoutFormResult } from "../src/services/payments/iyzico-checkout";
import { verifyIyzicoWebhookSignature } from "../src/services/payments/iyzico-client";
import crypto from "node:crypto";

// Local fixtures and mocked HTTP only. This does not claim an iyzico sandbox payment.
async function main() {
const checks: string[] = [];
function check(name: string, run: () => void) { run(); checks.push(name); console.log(`PASS ${name}`); }
const order = { id: "40000000-0000-4000-8000-000000000001", total_minor: 85000, provider_gross_minor: 76500 } as CommerceOrder;
const valid: RetrieveIyzicoCheckoutResponse = { status: "success", token: "test-token", conversationId: "test-conversation", basketId: order.id, currency: "TRY", price: "850.00", paidPrice: 850, paymentStatus: "SUCCESS", paymentId: "test-payment", fraudStatus: 1, itemTransactions: [{ itemId: order.id, price: 850, subMerchantPrice: 765 }] };
const verify = (result: RetrieveIyzicoCheckoutResponse) => verifyCommercePayment(result, order, "test-token", "test-conversation");
check("Verified matching result accepted", () => assert.equal(verify(valid), true));
check("Verified failed result is a failed payment", () => assert.equal(verify({ ...valid, paymentStatus: "FAILURE" }), false));
for (const [field, value] of Object.entries({ status: "failure", token: "other", conversationId: "other", basketId: "other", currency: "USD", price: 1, paidPrice: 1, paymentId: "", fraudStatus: 0, paymentStatus: "PENDING", itemTransactions: [] })) check(`Reject tampered or non-final ${field}`, () => assert.throws(() => verify({ ...valid, [field]: value })));
check("Reject mismatched provider payout", () => assert.throws(() => verify({ ...valid, itemTransactions: [{ itemId: order.id, price:850, subMerchantPrice:850 }] })));
check("Reject mismatched item identity", () => assert.throws(() => verify({ ...valid, itemTransactions: [{ itemId:"other", price:850, subMerchantPrice:765 }] })));
const priorEnv = { url: process.env.IYZICO_BASE_URL, api: process.env.IYZICO_API_KEY, secret: process.env.IYZICO_SECRET_KEY };
process.env.IYZICO_API_KEY = "local-test-key"; process.env.IYZICO_SECRET_KEY = "local-test-secret";
process.env.IYZICO_BASE_URL = "https://api.iyzipay.com";
check("Live payment endpoint is always disabled", () => assert.throws(assertSandbox));
process.env.IYZICO_BASE_URL = "https://sandbox-api.iyzipay.com";
check("Sandbox configuration accepted", assertSandbox);
check("Hosted checkout only accepts known sandbox HTTPS origins", () => { assert.ok(sandboxPaymentUrl("https://sandbox-cpp.iyzipay.com/test")); for (const url of ["https://cpp.iyzipay.com", "http://sandbox-cpp.iyzipay.com", "https://sandbox-cpp.iyzipay.com.attacker.test", "https://user@sandbox-cpp.iyzipay.com", "javascript:alert(1)"]) assert.throws(() => sandboxPaymentUrl(url)); });
check("Webhook signature rejects unsigned payloads and accepts exact HMAC", () => { const payload = { iyziEventType:"CHECKOUT_FORM_AUTH", iyziPaymentId:"test", token:"test-token", paymentConversationId:"test-conversation", status:"SUCCESS" }; const signature=crypto.createHmac("sha256","local-test-secret").update("local-test-secretCHECKOUT_FORM_AUTHtesttest-tokentest-conversationSUCCESS").digest("hex"); assert.equal(verifyIyzicoWebhookSignature({payload,signature}),true);assert.equal(verifyIyzicoWebhookSignature({payload,signature:null}),false);assert.equal(verifyIyzicoWebhookSignature({payload:{...payload,status:"FAILURE"},signature}),false); });
const priorFetch = globalThis.fetch;
try {
  globalThis.fetch = async (input, init) => {
    assert.equal(input,"https://sandbox-api.iyzipay.com/payment/iyzipos/checkoutform/auth/ecom/detail");
    const headers = init?.headers as Record<string,string>;
    assert.match(headers.Authorization,/^IYZWSv2 /);
    const body = JSON.parse(String(init?.body)); assert.equal(body.token,"test-token"); assert.equal(body.conversationId,"test-conversation");
    return new Response(JSON.stringify(valid),{status:200});
  };
  const result=await retrieveIyzicoCheckoutFormResult({token:"test-token",conversationId:"test-conversation"});
  check("Server retrieves processor result using authenticated sandbox request (mock HTTP)",()=>assert.equal(verify(result),true));
} finally {
  globalThis.fetch=priorFetch;
  for(const [key,value] of Object.entries({IYZICO_BASE_URL:priorEnv.url,IYZICO_API_KEY:priorEnv.api,IYZICO_SECRET_KEY:priorEnv.secret})) { if(value===undefined)delete process.env[key];else process.env[key]=value; }
}
mkdirSync("artifacts/direct-commerce",{recursive:true});writeFileSync("artifacts/direct-commerce/payment-tests.json",JSON.stringify({mode:"mock processor HTTP; no real sandbox transaction",checks},null,2));console.log(`${checks.length} local payment checks passed.`);

}
main().catch(error => { console.error(error); process.exitCode = 1; });
