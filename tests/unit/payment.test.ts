import { afterEach, describe, expect, it, vi } from "vitest";
import crypto from "node:crypto";
import { assertSandbox, isVerifiedSettlement, minorAmount, sandboxPaymentUrl, verifyCommercePayment } from "@/lib/commerce/payment";
import { verifyIyzicoWebhookSignature, iyzicoRequest } from "@/services/payments/iyzico-client";
import type { RetrieveIyzicoCheckoutResponse } from "@/services/payments/iyzico-checkout";

const order={id:"40000000-0000-4000-8000-000000000001",total_minor:85000,provider_gross_minor:76500};
const valid=():RetrieveIyzicoCheckoutResponse=>({status:"success",token:"token",conversationId:"order-1",basketId:order.id,currency:"TRY",price:850,paidPrice:850,paymentStatus:"SUCCESS",paymentId:"pay-1",fraudStatus:1,itemTransactions:[{itemId:order.id,price:850,subMerchantPrice:765,paymentTransactionId:"item-1",subMerchantKey:"merchant-1"}]});
const verify=(r:RetrieveIyzicoCheckoutResponse)=>verifyCommercePayment(r,order,"token","order-1",{paymentId:"pay-1",itemTransactionId:"item-1",submerchantKey:"merchant-1"});
afterEach(()=>vi.unstubAllEnvs());
describe("payment identity and money verification (offline)",()=>{
  it("accepts the complete response; a final failure never becomes paid",()=>{expect(verify(valid())).toBe(true);expect(verify({...valid(),paymentStatus:"FAILURE"})).toBe(false);});
  it.each([
    {status:"failure"},{token:"wrong"},{conversationId:"wrong"},{basketId:"wrong"},{currency:"USD"},{price:849.99},{paidPrice:850.01},{price:"8.5e2"},{price:"850.001"},{paymentId:"wrong"},{paymentId:""},{fraudStatus:0},{itemTransactions:[]},{itemTransactions:undefined},
  ])("rejects mismatched/missing response field %j",patch=>expect(()=>verify({...valid(),...patch} as RetrieveIyzicoCheckoutResponse)).toThrow("payment_verification_failed"));
  it.each([{itemId:"other"},{price:1},{subMerchantPrice:1},{subMerchantKey:"other"},{paymentTransactionId:"other"},{paymentTransactionId:""}])("rejects mismatched item %j",patch=>{
    const result=valid();result.itemTransactions=[{...result.itemTransactions![0],...patch}];expect(()=>verify(result)).toThrow("payment_verification_failed");
  });
  it("rejects non-final and missing payment result",()=>{for(const status of [undefined,"PENDING"]) expect(()=>verify({...valid(),paymentStatus:status})).toThrow("payment_not_final");});
  it("rejects multiple payment items",()=>{const r=valid();r.itemTransactions!.push({...r.itemTransactions![0]});expect(()=>verify(r)).toThrow();});
  it("verifies refund amount, currency, item and operation reference; release has no refund price",()=>{
    const r={status:"success",paymentTransactionId:"item",conversationId:"refund-1",currency:"TRY",price:"850.00"};
    expect(isVerifiedSettlement(r,"item","refund",85000,"refund-1")).toBe(true);
    for(const patch of [{status:"failure"},{paymentTransactionId:"wrong"},{conversationId:"wrong"},{currency:"USD"},{price:1},{price:undefined}]) expect(isVerifiedSettlement({...r,...patch},"item","refund",85000,"refund-1")).toBe(false);
    expect(isVerifiedSettlement(r,"","refund",85000)).toBe(false);
    expect(isVerifiedSettlement(r,"item","refund",0)).toBe(false);
    expect(isVerifiedSettlement({status:"success",paymentTransactionId:"item"},"item","release")).toBe(true);
  });
  it("converts valid minor amounts and rejects unusable processor fields",()=>{
    expect(minorAmount("1.25")).toBe(125);expect(minorAmount(0)).toBe(0);
    for(const value of [null,undefined,{},"",-1,"NaN",Infinity]) expect(minorAmount(value)).toBeNull();
  });
  it("only permits exact sandbox API and checkout origins",()=>{
    vi.stubEnv("IYZICO_API_KEY","fixture");vi.stubEnv("IYZICO_SECRET_KEY","fixture");vi.stubEnv("IYZICO_BASE_URL","");expect(()=>assertSandbox()).not.toThrow();
    for(const url of ["https://api.iyzipay.com","https://sandbox-api.iyzipay.com.evil.test","https://sandbox-api.iyzipay.com/path","https://sandbox-api.iyzipay.com?x=1","https://u:p@sandbox-api.iyzipay.com","https://sandbox-api.iyzipay.com/#x"]) {vi.stubEnv("IYZICO_BASE_URL",url);expect(()=>assertSandbox()).toThrow();}
    vi.stubEnv("IYZICO_BASE_URL","");vi.stubEnv("IYZICO_SECRET_KEY","");expect(()=>assertSandbox()).toThrow();
    expect(sandboxPaymentUrl("https://sandbox-cpp.iyzipay.com/checkout?token=fixture")).toContain("/checkout");
    for(const url of ["http://sandbox-cpp.iyzipay.com","https://cpp.iyzipay.com","https://sandbox-cpp.iyzipay.com.evil.test","https://u:p@sandbox-cpp.iyzipay.com","https://sandbox-cpp.iyzipay.com:444"]) expect(()=>sandboxPaymentUrl(url)).toThrow();
  });
  it("binds V3 HPP signature to token and rejects direct-format fallback/tampering",()=>{
    vi.stubEnv("IYZICO_SECRET_KEY","fixture-secret");
    const p={iyziEventType:"CHECKOUT_FORM_AUTH",iyziPaymentId:"1",paymentConversationId:"order-1",token:"token",status:"SUCCESS"};
    const sign=(s:string)=>crypto.createHmac("sha256","fixture-secret").update(s).digest("hex");
    const signature=sign("fixture-secretCHECKOUT_FORM_AUTH1tokenorder-1SUCCESS");
    expect(verifyIyzicoWebhookSignature({payload:p,signature})).toBe(true);
    expect(verifyIyzicoWebhookSignature({payload:{...p,token:"replaced"},signature})).toBe(false);
    expect(verifyIyzicoWebhookSignature({payload:p,signature:null})).toBe(false);
    expect(verifyIyzicoWebhookSignature({payload:p,signature:"invalid"})).toBe(false);
    expect(verifyIyzicoWebhookSignature({payload:{...p,paymentId:"1"},signature:sign("fixture-secretCHECKOUT_FORM_AUTH1order-1SUCCESS")})).toBe(false);
    expect(verifyIyzicoWebhookSignature({payload:{...p,token:"",paymentId:"1"},signature:sign("fixture-secretCHECKOUT_FORM_AUTH1order-1SUCCESS")})).toBe(true);
  });
  it("propagates processor outage without a retry or a fabricated payment result",async()=>{
    vi.stubEnv("IYZICO_API_KEY","fixture");vi.stubEnv("IYZICO_SECRET_KEY","fixture");vi.stubEnv("IYZICO_BASE_URL","https://sandbox-api.iyzipay.com");
    const fetch=vi.fn().mockRejectedValue(new DOMException("offline","TimeoutError"));vi.stubGlobal("fetch",fetch);
    await expect(iyzicoRequest({path:"/payment/test",body:{}})).rejects.toThrow("offline");expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });
});
