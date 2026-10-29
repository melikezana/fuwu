import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/services/auth/server",()=>({getServerAuthContext:vi.fn()}));
import { getServerAuthContext } from "@/services/auth/server";
import { getWaitlistContext, saveWaitlistPreference, withdrawWaitlistPreference } from "@/services/waitlist";
const auth=vi.mocked(getServerAuthContext);
const input={districtId:'',categoryId:'',consent:true,version:'prelaunch-2026-10-30',website:''};
beforeEach(()=>{auth.mockReset();});
describe('real interest persistence boundary',()=>{
  it('does not crash or claim signup availability when the health RPC rejects',async()=>{
    const rpc=vi.fn(()=>({abortSignal:vi.fn().mockRejectedValue(new Error('network unavailable'))}));
    auth.mockResolvedValue({user:{id:'test',email:'customer@example.com',email_confirmed_at:'2026-10-30'},supabase:{rpc}} as unknown as Awaited<ReturnType<typeof getServerAuthContext>>);
    expect(await getWaitlistContext()).toEqual({available:false,email:'customer@example.com',authenticated:true});
  });
  it('does not enable signup when health returns an incompatible version',async()=>{
    const rpc=vi.fn(()=>({abortSignal:vi.fn().mockResolvedValue({data:{available:true,version:999},error:null})}));
    auth.mockResolvedValue({user:null,supabase:{rpc}} as unknown as Awaited<ReturnType<typeof getServerAuthContext>>);
    expect(await getWaitlistContext()).toEqual({available:false,email:'',authenticated:false});
  });
  it('does not call storage for spam, malformed preferences or missing consent',async()=>{
    for(const change of [{website:'spam'},{consent:false},{districtId:'invalid'},{version:'old'}])expect((await saveWaitlistPreference({...input,...change})).ok).toBe(false);
    expect(auth).not.toHaveBeenCalled();
  });
  it('requires a confirmed account email',async()=>{
    auth.mockResolvedValue({user:{id:'test'},supabase:{}} as unknown as Awaited<ReturnType<typeof getServerAuthContext>>);
    expect((await saveWaitlistPreference(input)).ok).toBe(false);
  });
  it('never confirms a failed or malformed database result',async()=>{
    for(const response of [{data:null,error:{code:'42P01'}},{data:'fake-code',error:null}]){
      const rpc=vi.fn(()=>({abortSignal:vi.fn().mockResolvedValue(response)}));
      auth.mockResolvedValue({user:{id:'test',email_confirmed_at:'2026-10-30'},supabase:{rpc}} as unknown as Awaited<ReturnType<typeof getServerAuthContext>>);
      expect((await saveWaitlistPreference(input)).ok).toBe(false);
    }
  });
  it('confirms only a persisted UUID and does not accept email from the caller',async()=>{
    const rpc=vi.fn(()=>({abortSignal:vi.fn().mockResolvedValue({data:'ac000000-0000-4000-8000-000000000001',error:null})}));
    auth.mockResolvedValue({user:{id:'test',email_confirmed_at:'2026-10-30'},supabase:{rpc}} as unknown as Awaited<ReturnType<typeof getServerAuthContext>>);
    expect((await saveWaitlistPreference(input)).ok).toBe(true);
    expect(rpc.mock.calls[0]).toEqual(['save_launch_interest',{p_district_id:null,p_category_id:null,p_consent:true,p_version:input.version}]);
  });
  it('does not confirm withdrawal on a storage failure',async()=>{
    const rpc=vi.fn(()=>({abortSignal:vi.fn().mockResolvedValue({data:null,error:{code:'network'}})}));
    auth.mockResolvedValue({user:{id:'test'},supabase:{rpc}} as unknown as Awaited<ReturnType<typeof getServerAuthContext>>);
    expect((await withdrawWaitlistPreference()).ok).toBe(false);
  });
});
