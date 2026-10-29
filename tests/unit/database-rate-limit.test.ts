import {expect,it,vi} from "vitest";
import type {SupabaseClient} from "@supabase/supabase-js";
import type {Database} from "@/lib/supabase/types";
import {checkDatabaseRateLimit} from "@/lib/security/rateLimit";
it("consumes the atomic server counter; production denies a counter outage",async()=>{
  const abortSignal=vi.fn().mockResolvedValue({data:{allowed:true,limit:3,remaining:2,resetAt:10000},error:null});
  const rpc=vi.fn().mockReturnValue({abortSignal});
  const options={action:"request:create",limit:3,now:1000,windowMs:10000,userId:"fixture-user",supabase:{rpc} as unknown as SupabaseClient<Database>};
  expect(await checkDatabaseRateLimit(options)).toMatchObject({allowed:true,remaining:2});
  expect(rpc).toHaveBeenCalledWith("consume_user_rate_limit",{p_action:"request:create",p_limit:3,p_window_ms:10000});
  expect(abortSignal.mock.calls[0][0]).toBeInstanceOf(AbortSignal);
  vi.stubEnv("NODE_ENV","production");abortSignal.mockResolvedValue({data:null,error:{message:"SECRET_SENTINEL"}});
  const log=vi.spyOn(console,"error").mockImplementation(()=>{});
  expect(await checkDatabaseRateLimit(options)).toMatchObject({allowed:false,remaining:0});
  expect(JSON.stringify(log.mock.calls)).not.toContain("SECRET_SENTINEL");
});
