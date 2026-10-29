import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { assertSameOrigin, boundRequestBody, MAX_API_BODY_BYTES } from "@/lib/security/requestBoundary";
import { createSafeRedirectUrl, getSafeRedirectPath, getRequestOrigin, isSafeInternalPath } from "@/lib/security/safeRedirect";
import { validateReviewInput } from "@/lib/validations/reviewSchemas";
import { sanitizeText } from "@/lib/validations/text";
import { getImageMagicByteMimeType, validateImageMagicBytes, detectImageMagicByteMimeType } from "@/lib/validations/imageMagicBytes";
import { isUuid } from "@/lib/utils/validation";
import { checkRateLimit, resetRateLimit } from "@/lib/security/rateLimit";

describe("input and redirect validation",()=>{
  it.each(["https://evil.test","//evil.test","/\\evil.test","/%2fevil.test","/%5cevil.test","/\t/evil.test","/%0a/evil.test","javascript:alert(1)","/bad%zz"]) ("rejects unsafe redirect %j",value=>{
    expect(isSafeInternalPath(value)).toBe(false);expect(getSafeRedirectPath(value,"/account")).toBe("/account");
  });
  it("preserves internal query/hash and validates the redirect origin",()=>{
    expect(isSafeInternalPath(" /orders?next=a#status ")).toBe(true);
    expect(createSafeRedirectUrl("/orders","https://fuwu.test").href).toBe("https://fuwu.test/orders");
    expect(getSafeRedirectPath(null,"/account")).toBe("/account");
    expect(getSafeRedirectPath(undefined)).toBe("/");
    expect(getRequestOrigin({url:"http://localhost:3109/a",headers:new Headers({host:"127.0.0.1:3109"})})).toBe("http://127.0.0.1:3109");
    expect(getRequestOrigin({url:"https://fuwu.test/a",headers:new Headers({host:"evil.test"})})).toBe("https://fuwu.test");
    expect(getRequestOrigin({url:"http://localhost/a",headers:new Headers({host:"localhost.evil.test"})})).toBe("http://localhost");
  });
  it("sanitizes script/HTML as plain text; rejects long comments and invalid ratings",()=>{
    const r=validateReviewInput({comment:'<script>alert(1)</script> <img src=x onerror=alert(1)> yeterli yorum',rating:5});
    expect(r.ok).toBe(true);
    expect(sanitizeText('<script>alert(1)</script>\u0000')).not.toMatch(/[<>\u0000]/);
    expect(validateReviewInput({comment:"x".repeat(1001),rating:5}).ok).toBe(false);
    expect(validateReviewInput({comment:"",rating:5}).ok).toBe(false);
    expect(validateReviewInput({comment:"kısa",rating:5}).ok).toBe(false);
    for(const rating of [0,6,1.5,NaN]) expect(validateReviewInput({comment:"Yeterince uzun yorum",rating}).ok).toBe(false);
  });
  it("only accepts canonical UUIDs with supported version and variant",()=>{
    expect(isUuid("40000000-0000-4000-8000-000000000001")).toBe(true);
    for(const value of ["", "invalid", "40000000-0000-9000-8000-000000000001", "40000000-0000-4000-0000-000000000001", "40000000-0000-4000-8000-000000000001' OR 1=1"]) expect(isUuid(value)).toBe(false);
  });
  it("limits attempts per identity and resets at the window boundary",()=>{
    resetRateLimit();
    const call=(key="a",now=100)=>checkRateLimit({key,now,limit:2,windowMs:1000});
    expect(call()).toMatchObject({allowed:true,remaining:1,resetAt:1100});
    expect(call()).toMatchObject({allowed:true,remaining:0});
    expect(call()).toMatchObject({allowed:false,remaining:0});
    expect(call("b").allowed).toBe(true);expect(call("a",1100).allowed).toBe(true);
    resetRateLimit("a");expect(call().remaining).toBe(1);resetRateLimit();
  });
});
describe("HTTP request boundary",()=>{
  it("rejects cross-origin and missing-origin cross-site mutations",()=>{
    const request=(headers:Record<string,string>)=>({url:"https://fuwu.test/orders",headers:new Headers(headers)});
    expect(()=>assertSameOrigin(request({origin:"https://evil.test"}))).toThrow("forbidden");
    expect(()=>assertSameOrigin(request({"sec-fetch-site":"cross-site"}))).toThrow("forbidden");
    expect(()=>assertSameOrigin(request({origin:"https://fuwu.test"}))).not.toThrow();
    expect(()=>assertSameOrigin(request({"sec-fetch-site":"same-origin"}))).not.toThrow();
    expect(()=>assertSameOrigin(request({}))).not.toThrow();
  });
  it("enforces body byte length even without Content-Length or with a lying header",async()=>{
    const request=(body:string,headers:Record<string,string>={})=>new NextRequest("http://localhost/api/test",{method:"POST",body,headers});
    expect((await boundRequestBody(request("x".repeat(MAX_API_BODY_BYTES)))).byteLength).toBe(MAX_API_BODY_BYTES);
    await expect(boundRequestBody(request("x".repeat(MAX_API_BODY_BYTES+1)))).rejects.toMatchObject({status:413});
    await expect(boundRequestBody(request("ü".repeat(MAX_API_BODY_BYTES/2+1),{"content-length":"1"}))).rejects.toMatchObject({status:413});
    await expect(boundRequestBody(request("{}",{"content-length":"-1"}))).rejects.toThrow("payload_too_large");
    await expect(boundRequestBody(request("{}",{"content-length":String(MAX_API_BODY_BYTES+1)}))).rejects.toThrow();
    expect((await boundRequestBody(new Request("http://localhost/"))).byteLength).toBe(0);
  });
});
describe("image header validation fails closed",()=>{
  const png=Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
  it("detects JPEG, PNG, WebP; rejects SVG, script and truncated signatures",async()=>{
    expect(detectImageMagicByteMimeType(png)).toBe("image/png");
    expect(detectImageMagicByteMimeType(Uint8Array.from([0xff,0xd8,0xff]))).toBe("image/jpeg");
    expect(detectImageMagicByteMimeType(new TextEncoder().encode("RIFF0000WEBP"))).toBe("image/webp");
    for(const data of ["<svg onload=alert(1)>","<script>","RIFF",""]) expect(detectImageMagicByteMimeType(new TextEncoder().encode(data))).toBeNull();
    const file=new File([png],"fixture.png",{type:"image/png"});
    expect(await validateImageMagicBytes(file)).toBeNull();expect(await getImageMagicByteMimeType(file)).toBe("image/png");
    expect(await validateImageMagicBytes(new File(["<script>"],"fake.png",{type:"image/png"}))).not.toBeNull();
    expect(await validateImageMagicBytes(new File([],"empty.png"))).not.toBeNull();
    expect(await getImageMagicByteMimeType(new File([],"empty.png"))).toBeNull();
  });
  it("rejects unreadable/missing header readers instead of passing",async()=>{
    for(const file of [{size:1},{size:1,slice:()=>({})},{size:1,slice:()=>{throw new Error("unreadable");}}] as File[]) {
      expect(await validateImageMagicBytes(file)).not.toBeNull();expect(await getImageMagicByteMimeType(file)).toBeNull();
    }
  });
});
