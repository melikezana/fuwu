import {beforeEach,describe,expect,it,vi} from "vitest";
import {NextRequest} from "next/server";
vi.mock("@/lib/logger",()=>({logWarn:vi.fn(),logInfo:vi.fn(),logError:vi.fn()}));
vi.mock("@/services/auth/server",()=>({getServerAuthContext:vi.fn()}));
import {getServerAuthContext} from "@/services/auth/server";
import {POST} from "@/app/api/commerce/orders/route";
const auth=vi.mocked(getServerAuthContext);
const request=(data:unknown)=>new NextRequest("https://fuwu.test/api/commerce/orders",{method:"POST",headers:{origin:"https://fuwu.test","content-type":"application/json"},body:JSON.stringify(data)});
beforeEach(()=>{ vi.stubEnv("FUWU_SANDBOX_CHECKOUT_ENABLED", "true"); auth.mockResolvedValue({user:null,profile:null,supabase:null,error:null,isConfigured:true}); });
describe("real order API with stubbed Auth/RPC (RLS tested in real SQL separately)",()=>{
  it("rejects a missing session before any purchase mutation",async()=>{expect((await POST(request({}))).status).toBe(401);});
  it("keeps checkout closed by default even for an authenticated customer",async()=>{
    vi.stubEnv("FUWU_SANDBOX_CHECKOUT_ENABLED", "false");
    const rpc=vi.fn();
    auth.mockResolvedValue({user:{id:"fixture-user"},supabase:{rpc},profile:{role:"customer"},error:null,isConfigured:true} as unknown as Awaited<ReturnType<typeof getServerAuthContext>>);
    const result=await POST(request({}));
    expect(result.status).toBe(503);expect((await result.json()).message).toBe("Online satın alma henüz açılmadı.");expect(rpc).not.toHaveBeenCalled();
  });
  it("rejects malformed UUID/timestamp before RPC and maps cross-owner denial",async()=>{
    const rpc=vi.fn().mockResolvedValue({data:null,error:{code:"42501",message:"forbidden"}});
    auth.mockResolvedValue({user:{id:"fixture-user"},supabase:{rpc},profile:{role:"customer"},error:null,isConfigured:true} as unknown as Awaited<ReturnType<typeof getServerAuthContext>>);
    const valid={offeringId:"40000000-0000-4000-8000-000000000001",districtId:"40000000-0000-4000-8000-000000000002",idempotencyKey:"40000000-0000-4000-8000-000000000003",address:"Test sentetik adres",startsAt:"2026-10-31T12:00:00+03:00",expectedPriceMinor:10000};
    expect((await POST(request({...valid,startsAt:"2026-02-30T12:00:00Z"}))).status).toBe(400);
    expect((await POST(request({...valid,offeringId:"invalid"}))).status).toBe(400);expect(rpc).not.toHaveBeenCalled();
    expect((await POST(request(valid))).status).toBe(403);expect(rpc).toHaveBeenCalledTimes(1);
  });
});
