import {describe,expect,it} from "vitest";
import {NextRequest} from "next/server";
import {POST as support} from "@/app/api/support/messages/route";
import {POST as assistant} from "@/app/api/ai-assistant/analyze/route";
describe("public support/AI endpoint body and Origin limits",()=>{
  it("rejects cross-site mutations before dependencies",async()=>{
    for(const route of [support,assistant]) {
      const r=await route(new NextRequest("https://fuwu.test/api/test",{method:"POST",headers:{origin:"https://attacker.invalid"},body:"{}"}));
      expect(r.status).toBe(403);
    }
  });
  it("rejects support JSON and AI multipart oversized declarations before parsing",async()=>{
    const request=(n:number)=>new NextRequest("https://fuwu.test/api/test",{method:"POST",headers:{origin:"https://fuwu.test","content-length":String(n)},body:"{}"});
    expect((await support(request(65537))).status).toBe(413);
    expect((await assistant(request(12*1024*1024))).status).toBe(413);
  });
});
