import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/services/auth/server",()=>({getServerAuthContext:vi.fn()}));
import { getServerAuthContext } from "@/services/auth/server";
import { getWaitlistContext, saveWaitlistPreference, withdrawWaitlistMarketingConsent, withdrawWaitlistPreference } from "@/services/waitlist";
import { LAUNCH_MARKETING_VERSION, LAUNCH_NOTICE_VERSION } from "@/lib/legal/notices";
type Auth=Awaited<ReturnType<typeof getServerAuthContext>>;
const auth=vi.mocked(getServerAuthContext);
const input={districtId:'',categoryId:'',noticeAcknowledged:true,noticeVersion:LAUNCH_NOTICE_VERSION,marketingEmail:false,marketingVersion:'',website:''};
const verified={id:'test',email:'customer@example.invalid',email_confirmed_at:'2026-11-13'};
const rpcResolving=(data:unknown,error:unknown=null)=>vi.fn(()=>({abortSignal:vi.fn().mockResolvedValue({data,error})}));
// Talep satırı okuması (RLS + user_id süzgeci) için en küçük sahte zincir.
const ownRow=(row:unknown,error:unknown=null)=>{const eq=vi.fn(()=>({abortSignal:()=>({maybeSingle:vi.fn().mockResolvedValue({data:row,error})})}));return {from:vi.fn(()=>({select:()=>({eq})})),eq};};
beforeEach(()=>{auth.mockReset();});

describe('launch interest: health and own entry',()=>{
  it('does not crash or claim availability when the health RPC rejects',async()=>{
    const rpc=vi.fn(()=>({abortSignal:vi.fn().mockRejectedValue(new Error('network unavailable'))}));
    auth.mockResolvedValue({user:verified,supabase:{rpc,...ownRow(null)}} as unknown as Auth);
    expect(await getWaitlistContext()).toEqual({available:false,marketingEmailAvailable:false,email:verified.email,authenticated:true,entry:null});
  });
  it('does not enable registration for an incompatible health version',async()=>{
    auth.mockResolvedValue({user:null,supabase:{rpc:rpcResolving({available:true,marketing_email:true,version:999})}} as unknown as Auth);
    expect(await getWaitlistContext()).toEqual({available:false,marketingEmailAvailable:false,email:'',authenticated:false,entry:null});
  });
  it('offers the e-mail consent only when registration and marketing are both enabled',async()=>{
    for(const [health,expected] of [[{available:true,version:1},false],[{available:true,marketing_email:true,version:1},true],[{available:false,marketing_email:true,version:1},false]] as const){
      auth.mockResolvedValue({user:null,supabase:{rpc:rpcResolving(health)}} as unknown as Auth);
      expect((await getWaitlistContext()).marketingEmailAvailable).toBe(expected);
    }
  });
  it('reads only the signed-in user\'s active entry, filtered by user id',async()=>{
    const row=ownRow({district_id:'d',category_id:null,marketing_email_consent:true,withdrawn_at:null});
    auth.mockResolvedValue({user:verified,supabase:{rpc:rpcResolving({available:true,version:1}),from:row.from}} as unknown as Auth);
    expect((await getWaitlistContext()).entry).toEqual({districtId:'d',categoryId:'',marketingEmail:true});
    expect(row.eq).toHaveBeenCalledWith('user_id',verified.id);
  });
  it('treats a withdrawn entry as no entry',async()=>{
    const row=ownRow({district_id:'d',category_id:'c',marketing_email_consent:false,withdrawn_at:'2026-11-13'});
    auth.mockResolvedValue({user:verified,supabase:{rpc:rpcResolving({available:true,version:1}),from:row.from}} as unknown as Auth);
    expect((await getWaitlistContext()).entry).toBeNull();
  });
});

describe('launch interest: separate notice acknowledgement and marketing consent',()=>{
  it('does not call storage for spam, malformed preferences, a missing acknowledgement or stale versions',async()=>{
    for(const change of [{website:'spam'},{noticeAcknowledged:false},{noticeVersion:'prelaunch-2026-10-30'},{districtId:'invalid'},{marketingEmail:true,marketingVersion:'old'}])
      expect((await saveWaitlistPreference({...input,...change})).ok).toBe(false);
    expect(auth).not.toHaveBeenCalled();
  });
  it('requires a confirmed account email',async()=>{
    auth.mockResolvedValue({user:{id:'test'},supabase:{}} as unknown as Auth);
    expect((await saveWaitlistPreference(input)).ok).toBe(false);
  });
  it('sends the acknowledgement and the marketing choice as separate, versioned values',async()=>{
    const rpc=rpcResolving('ac000000-0000-4000-8000-000000000001');
    auth.mockResolvedValue({user:verified,supabase:{rpc}} as unknown as Auth);
    expect(await saveWaitlistPreference(input)).toEqual({ok:true,message:'Talebin kaydedildi.'});
    expect(rpc.mock.calls[0]).toEqual(['save_launch_interest_v2',{p_district_id:null,p_category_id:null,p_notice_version:LAUNCH_NOTICE_VERSION,p_notice_acknowledged:true,p_marketing_email:false,p_marketing_version:''}]);
    await saveWaitlistPreference({...input,marketingEmail:true,marketingVersion:LAUNCH_MARKETING_VERSION});
    expect(rpc.mock.calls[1]).toEqual(['save_launch_interest_v2',{p_district_id:null,p_category_id:null,p_notice_version:LAUNCH_NOTICE_VERSION,p_notice_acknowledged:true,p_marketing_email:true,p_marketing_version:LAUNCH_MARKETING_VERSION}]);
  });
  it('never confirms a failed or malformed database result and maps known refusals to plain Turkish',async()=>{
    for(const response of [{data:null,error:{code:'42P01'}},{data:'fake-code',error:null}]){
      auth.mockResolvedValue({user:verified,supabase:{rpc:rpcResolving(response.data,response.error)}} as unknown as Auth);
      expect((await saveWaitlistPreference(input)).ok).toBe(false);
    }
    auth.mockResolvedValue({user:verified,supabase:{rpc:rpcResolving(null,{message:'marketing_closed'})}} as unknown as Auth);
    expect((await saveWaitlistPreference(input)).message).toContain('E-posta onayı şu anda alınamıyor');
  });
  it('does not leak transport errors or claim success after a rejection',async()=>{
    const rpc=vi.fn(()=>({abortSignal:vi.fn().mockRejectedValue(new Error('private database details'))}));
    auth.mockResolvedValue({user:verified,supabase:{rpc}} as unknown as Auth);
    for (const result of [await saveWaitlistPreference(input),await withdrawWaitlistPreference(),await withdrawWaitlistMarketingConsent()]) {
      expect(result.ok).toBe(false);expect(result.message).not.toContain('private database details');
    }
  });
  it('withdraws the e-mail consent through its own RPC, separate from removing the request',async()=>{
    const rpc=rpcResolving(true);
    auth.mockResolvedValue({user:verified,supabase:{rpc}} as unknown as Auth);
    expect((await withdrawWaitlistMarketingConsent()).ok).toBe(true);
    expect((await withdrawWaitlistPreference()).ok).toBe(true);
    expect(rpc.mock.calls.map(call=>(call as unknown[])[0])).toEqual(['withdraw_launch_marketing_consent','withdraw_launch_interest']);
  });
  it('does not confirm withdrawal on a storage failure',async()=>{
    auth.mockResolvedValue({user:{id:'test'},supabase:{rpc:rpcResolving(null,{code:'network'})}} as unknown as Auth);
    expect((await withdrawWaitlistPreference()).ok).toBe(false);
    expect((await withdrawWaitlistMarketingConsent()).ok).toBe(false);
  });
});
