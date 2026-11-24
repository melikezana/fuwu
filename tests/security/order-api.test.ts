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
  const signedIn=(rpc:ReturnType<typeof vi.fn>)=>auth.mockResolvedValue({user:{id:`fixture-user-${crypto.randomUUID()}`},supabase:{rpc},profile:{role:"customer"},error:null,isConfigured:true} as unknown as Awaited<ReturnType<typeof getServerAuthContext>>);
  const valid={offeringId:"40000000-0000-4000-8000-000000000001",districtId:"40000000-0000-4000-8000-000000000002",idempotencyKey:"40000000-0000-4000-8000-000000000003",address:"Test sentetik adres",startsAt:"2026-10-31T12:00:00+03:00",expectedTotalMinor:10000};
  it("honours the server-side kill switch before any purchase mutation",async()=>{
    vi.stubEnv("FUWU_DIRECT_PURCHASE_DISABLED", "true");
    const rpc=vi.fn(); signedIn(rpc);
    const result=await POST(request(valid));
    expect(result.status).toBe(503);expect((await result.json()).message).toBe("Satın alma geçici olarak kapalı.");expect(rpc).not.toHaveBeenCalled();
    vi.stubEnv("FUWU_DIRECT_PURCHASE_DISABLED", "");
  });
  it("never starts a card order while online card payment is closed",async()=>{
    vi.stubEnv("FUWU_SANDBOX_CHECKOUT_ENABLED", "false");
    const rpc=vi.fn(); signedIn(rpc);
    const result=await POST(request({...valid,paymentMethod:"CARD"}));
    expect(result.status).toBe(503);expect(rpc).not.toHaveBeenCalled();
  });
  it("rejects malformed UUID/timestamp/basket/note/payment method before RPC and maps cross-owner denial",async()=>{
    const rpc=vi.fn().mockResolvedValue({data:null,error:{code:"42501",message:"forbidden"}}); signedIn(rpc);
    expect((await POST(request({...valid,startsAt:"2026-02-30T12:00:00Z"}))).status).toBe(400);
    expect((await POST(request({...valid,offeringId:"invalid"}))).status).toBe(400);
    expect((await POST(request({...valid,expectedTotalMinor:-5}))).status).toBe(400);
    expect((await POST(request({...valid,addons:"not-a-basket"}))).status).toBe(400);
    expect((await POST(request({...valid,addons:"40000000-0000-4000-8000-000000000009:99"}))).status).toBe(400);
    expect((await POST(request({...valid,note:"x".repeat(501)}))).status).toBe(400);
    expect((await POST(request({...valid,paymentMethod:"CRYPTO"}))).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
    expect((await POST(request(valid))).status).toBe(403);expect(rpc).toHaveBeenCalledTimes(1);
  });
  it("places a pay-at-door order with the server-priced basket and never trusts a client price",async()=>{
    const rpc=vi.fn().mockResolvedValue({data:{id:"40000000-0000-4000-8000-000000000010",status:"CONFIRMED"},error:null}); signedIn(rpc);
    const addon="40000000-0000-4000-8000-00000000000a";
    const result=await POST(request({...valid,addons:`${addon}:2`,note:"  Zil bozuk, arayın.  ",expectedPriceMinor:1,total_minor:1}));
    expect(result.status).toBe(201);
    expect(rpc).toHaveBeenCalledWith("commerce_place_order",expect.objectContaining({p_payment_method:"PAY_AT_DOOR",p_addons:[{id:addon,quantity:2}],p_expected_total_minor:10000,p_note:"  Zil bozuk, arayın.  "}));
    const args=rpc.mock.calls[0][1] as Record<string,unknown>;
    expect(Object.keys(args)).not.toContain("p_expected_price_minor");
  });
  it("maps database refusals to safe codes",async()=>{
    for(const [message,status] of [["slot_unavailable",409],["price_changed",409],["too_many_open_orders",429],["pay_at_door_closed",503],["invalid_addons",400]] as const){
      const rpc=vi.fn().mockResolvedValue({data:null,error:{code:"P0001",message}}); signedIn(rpc);
      const response=await POST(request(valid)); expect(response.status).toBe(status); expect((await response.json()).error).toBe(message);
    }
    const leaky=vi.fn().mockResolvedValue({data:null,error:{code:"P0001",message:"relation secret_table does not exist"}}); signedIn(leaky);
    const response=await POST(request(valid)); expect(JSON.stringify(await response.json())).not.toContain("secret_table");
  });
});
