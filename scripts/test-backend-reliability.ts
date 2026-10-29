import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/types";
import { NextRequest, NextResponse } from "next/server";
import { withCommerceApi } from "../src/lib/commerce/api";
import { processOrderSettlement } from "../src/services/commerce/settlement";
import { verifyIyzicoWebhookSignature } from "../src/services/payments/iyzico-client";
import { reconcileCommercePayment } from "../src/services/commerce/reconciliation";
import { handleServiceError } from "../src/lib/errors";
import type { PaymentTransaction } from "../src/lib/commerce/types";

// Offline fault injection through the real Supabase SDK and real iyzico HTTP adapter.
// DB persistence/concurrency is covered separately by PostgreSQL tests.
async function main() {
  const priorFetch=globalThis.fetch, priorEnv={...process.env};
  const id="40000000-0000-4000-8000-000000000001", item="fixture-item";
  const checks:string[]=[];
  const check=async(name:string,run:()=>Promise<void>|void)=>{await run();checks.push(name);console.log("PASS "+name);};
  process.env.IYZICO_API_KEY="offline-key";process.env.IYZICO_SECRET_KEY="offline-secret";process.env.IYZICO_BASE_URL="https://sandbox-api.iyzipay.com";
  const db=createClient<Database>("https://offline.supabase.test","offline-key",{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>globalThis.fetch(input,init)}});
  let state:string|null=null, calls=0, finishes=0, failureClass:string|null=null, mode="ok", reconcileMode="", resolutions=0;
  const reset=(next:string)=>{state=null;calls=0;finishes=0;failureClass=null;mode=next;};
  globalThis.fetch=async(input,init)=>{
    const url=String(input),body=JSON.parse(String(init?.body??"{}"));
    if(reconcileMode) {
      if(url.includes('/rest/v1/orders')) return Response.json({id,total_minor:85000,provider_gross_minor:76500});
      if(url.endsWith('/rpc/commerce_resolve_payment')) {resolutions++;return Response.json(body.p_success?'CONFIRMED':'PAYMENT_FAILED');}
      if(url.endsWith('/auth/ecom/detail')) {
        if(reconcileMode==='timeout')throw new DOMException('PII_SENTINEL','TimeoutError');
        return Response.json({status:'success',token:'offline-token',conversationId:'order-'+id,basketId:id,currency:'TRY',price:reconcileMode==='amount'?1:850,paidPrice:850,paymentStatus:reconcileMode==='pending'?'PENDING':reconcileMode==='failure'?'FAILURE':'SUCCESS',paymentId:'offline-payment',fraudStatus:1,itemTransactions:[{itemId:id,price:850,subMerchantPrice:765,paymentTransactionId:item,subMerchantKey:reconcileMode==='merchant'?'wrong':'offline-merchant'}]});
      }
    }
    if(url.startsWith("https://sandbox-api.iyzipay.com/")) {
      calls++;
      if(mode==="timeout") throw new DOMException("PII_SENTINEL token-secret", "TimeoutError");
      if(mode==="rejected") return Response.json({status:"failure",errorMessage:"PII_SENTINEL token-secret"});
      return Response.json({status:"success",conversationId:mode==="conversation"?"wrong":body.conversationId,paymentTransactionId:mode==="item"?"wrong":item,currency:mode==="currency"?"USD":"TRY",price:mode==="amount"?1:850});
    }
    if(url.endsWith("/rpc/commerce_claim_settlement")) {
      if(mode==="claim_failure")return Response.json({code:"DBERROR",message:"PII_SENTINEL token-secret"},{status:503});
      if(state)return Response.json({claimed:false,state});
      state="IN_FLIGHT";return Response.json({claimed:true,total_minor:85000,item_transaction_id:item});
    }
    if(url.endsWith("/rpc/commerce_record_settlement_result")) {
      if(mode==="audit_failure")return Response.json({message:"PII_SENTINEL"},{status:503});
      if(body.p_outcome==="VERIFIED")state="VERIFIED";
      else if(state!=="VERIFIED"){state="MANUAL_REVIEW";failureClass=body.p_failure_class;}
      return new Response(null,{status:204});
    }
    if(url.endsWith("/rpc/commerce_finish_settlement")) {
      finishes++;
      if(mode==="finish_failure"&&finishes===1)return Response.json({message:"PII_SENTINEL"},{status:503});
      assert.equal(state,"VERIFIED");state="COMPLETED";return new Response(null,{status:204});
    }
    throw new Error("Unexpected offline URL");
  };
  try {
    await check("Verified refund completes once; repeated request sends no second external refund",async()=>{reset("ok");assert.equal((await processOrderSettlement(id,"refund",db)).state,"completed");assert.equal((await processOrderSettlement(id,"refund",db)).state,"completed");assert.equal(calls,1);assert.equal(finishes,1);});
    for(const mismatch of ["amount","currency","item","conversation"]){await check("Unverified refund "+mismatch+" stays pending and cannot retry",async()=>{reset(mismatch);assert.equal((await processOrderSettlement(id,"refund",db)).state,"manual_review");assert.equal(failureClass,"processor_unverified");await processOrderSettlement(id,"refund",db);assert.equal(calls,1);assert.equal(finishes,0);});}
    await check("Timeout after dispatch remains manual review and does not repeat the external side effect",async()=>{reset("timeout");assert.equal((await processOrderSettlement(id,"refund",db)).state,"manual_review");assert.equal(failureClass,"processor_timeout");await processOrderSettlement(id,"refund",db);assert.equal(calls,1);assert.equal(finishes,0);});
    await check("Processor rejection is classified without completing a refund",async()=>{reset("rejected");await processOrderSettlement(id,"refund",db);assert.equal(failureClass,"processor_rejected");assert.equal(finishes,0);});
    await check("Verified response with failed DB finalization recovers without another processor call",async()=>{reset("finish_failure");assert.equal((await processOrderSettlement(id,"release",db)).state,"manual_review");assert.equal(state,"VERIFIED");assert.equal((await processOrderSettlement(id,"release",db)).state,"completed");assert.equal(calls,1);assert.equal(finishes,2);});
    await check("Audit outage preserves the original IN_FLIGHT claim and never finishes or repeats",async()=>{reset("audit_failure");assert.equal((await processOrderSettlement(id,"refund",db)).state,"manual_review");assert.equal(state,"IN_FLIGHT");await processOrderSettlement(id,"refund",db);assert.equal(calls,1);assert.equal(finishes,0);});
    await check("Claim error fails before a processor operation",async()=>{reset("claim_failure");assert.equal((await processOrderSettlement(id,"refund",db)).state,"unavailable");assert.equal(calls,0);});
    await check("Direct webhook signature cannot authorize an unsigned HPP token",()=>{
      const payload={iyziEventType:"PAYMENT_API",paymentId:"payment",paymentConversationId:"order-test",status:"SUCCESS"};
      const signature=crypto.createHmac("sha256","offline-secret").update("offline-secretPAYMENT_APIpaymentorder-testSUCCESS").digest("hex");
      assert.equal(verifyIyzicoWebhookSignature({payload,signature}),true);
      assert.equal(verifyIyzicoWebhookSignature({payload:{...payload,token:"replaced-token",iyziPaymentId:"payment"},signature}),false);
    });
    await check("API hides raw DB details and correlates every error and success",async()=>{
      const request=new NextRequest("https://fuwu.test/api/commerce/orders",{headers:{"x-request-id":"PII_SENTINEL"}});
      const route=withCommerceApi(async()=>NextResponse.json({error:"SQL error PII_SENTINEL token-secret"},{status:409}));
      const response=await route(request),body=await response.json();
      assert.equal(response.status,503);assert.equal(body.code,"service_unavailable");assert.match(body.requestId,/^[0-9a-f-]{36}$/);assert.equal(response.headers.get("x-request-id"),body.requestId);assert.doesNotMatch(JSON.stringify(body),/PII_SENTINEL|token-secret|SQL/);assert.equal(response.headers.get("cache-control"),"private, no-store");
      const conflict=await withCommerceApi(async()=>NextResponse.json({error:"slot_unavailable"},{status:409}))(request);assert.equal(conflict.status,409);
      const denied=await withCommerceApi(async()=>NextResponse.json({error:"transition_forbidden"},{status:409}))(request);assert.equal(denied.status,403);
      const success=await withCommerceApi(async()=>NextResponse.json({ok:true}))(request);assert.ok(success.headers.get("x-request-id"));
      const crashed=await withCommerceApi(async()=>{throw new Error("PII_SENTINEL token-secret");})(request);assert.equal(crashed.status,503);assert.doesNotMatch(await crashed.text(),/PII_SENTINEL|token-secret/);
    });
    const transaction={order_id:id,checkout_token:'offline-token',conversation_id:'order-'+id,environment:'sandbox',payment_id:null,item_transaction_id:null,submerchant_key:'offline-merchant'} as PaymentTransaction;
    for(const fault of ['pending','amount','merchant','timeout'])await check(`Payment reconciliation ${fault} never calls the payment-state RPC`,async()=>{
      reconcileMode=fault;resolutions=0;await assert.rejects(reconcileCommercePayment(db,transaction));assert.equal(resolutions,0);
    });
    await check('Signed notification payment identity must match server retrieval',async()=>{
      reconcileMode='success';resolutions=0;
      await assert.rejects(reconcileCommercePayment(db,transaction,{conversationId:transaction.conversation_id,paymentId:'wrong-payment',token:transaction.checkout_token!}));assert.equal(resolutions,0);
    });
    for(const final of ['success','failure'])await check(`Verified final ${final} alone reaches the payment-state RPC`,async()=>{
      reconcileMode=final;resolutions=0;const result=await reconcileCommercePayment(db,transaction);assert.equal(resolutions,1);assert.equal(result.status,final==='success'?'CONFIRMED':'PAYMENT_FAILED');
    });
    await check('SQL diagnostic values never appear in service logs',()=>{
      const captured:unknown[]=[];const priorError=console.error,priorWarn=console.warn;
      try {console.error=(...args)=>{captured.push(args);};console.warn=(...args)=>{captured.push(args);};handleServiceError({code:'23505',message:'PII_SENTINEL',details:'PII_SENTINEL token-secret',hint:'PII_SENTINEL'});}
      finally{console.error=priorError;console.warn=priorWarn;}
      assert.doesNotMatch(JSON.stringify(captured),/PII_SENTINEL|token-secret/);
    });
  } finally {globalThis.fetch=priorFetch;for(const key of ["IYZICO_API_KEY","IYZICO_SECRET_KEY","IYZICO_BASE_URL"]){if(priorEnv[key]===undefined)delete process.env[key];else process.env[key]=priorEnv[key];}}
  mkdirSync("artifacts/backend-reliability",{recursive:true});writeFileSync("artifacts/backend-reliability/fault-injection.json",JSON.stringify({scope:"Offline mocked processor HTTP and Supabase RPC; not a real sandbox transaction",checks},null,2));
  console.log(`${checks.length} reliability fault-injection checks passed.`);
}
main().catch(()=>{console.error("Reliability test failed; inspect local assertions.");process.exitCode=1;});
