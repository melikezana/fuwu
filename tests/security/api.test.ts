import { describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
vi.mock("@/lib/logger",()=>({logWarn:vi.fn(),logInfo:vi.fn(),logError:vi.fn()}));
import { commerceDatabaseError, withCommerceApi } from "@/lib/commerce/api";
describe("real API wrapper with stubbed handler; no database/network",()=>{
  it("blocks CSRF before the handler and bounds webhook payloads despite Origin exemption",async()=>{
    const handler=vi.fn(async()=>NextResponse.json({ok:true}));const route=withCommerceApi(handler);
    const r=await route(new NextRequest("https://fuwu.test/api/commerce/orders",{method:"POST",headers:{origin:"https://evil.test"},body:"{}"}));
    expect(r.status).toBe(403);expect(handler).not.toHaveBeenCalled();
    const webhook=await route(new NextRequest("https://fuwu.test/api/commerce/payment-callback",{method:"POST",headers:{origin:"https://sandbox.iyzipay.com"},body:"x".repeat(65537)}));
    expect(webhook.status).toBe(413);expect(handler).not.toHaveBeenCalled();
    const valid=await route(new NextRequest("https://fuwu.test/api/commerce/orders",{method:"POST",headers:{origin:"https://fuwu.test"},body:"{}"}));
    expect(valid.status).toBe(200);expect(handler).toHaveBeenCalledTimes(1);
  });
  it("redacts unknown exceptions and SQL errors, adds request ID and no-store",async()=>{
    const response=await withCommerceApi(async()=>{throw new Error("SECRET_SENTINEL token address SQL");})(new NextRequest("https://fuwu.test/api/commerce/quote"));
    const body=await response.json();expect(response.status).toBe(503);expect(JSON.stringify(body)).not.toContain("SECRET_SENTINEL");
    expect(body.requestId).toBe(response.headers.get("x-request-id"));expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(commerceDatabaseError({message:"SECRET_SENTINEL",code:"42501"})).toBe("forbidden");
    expect(commerceDatabaseError({message:"SECRET_SENTINEL"})).toBe("service_unavailable");
  });
  it("preserves Retry-After on rate limit rejection",async()=>{
    const r=await withCommerceApi(async()=>NextResponse.json({error:"rate_limit"},{status:429,headers:{"retry-after":"30"}}))(new NextRequest("https://fuwu.test/api/commerce/slots"));
    expect(r.status).toBe(429);expect(r.headers.get("retry-after")).toBe("30");
  });
});
