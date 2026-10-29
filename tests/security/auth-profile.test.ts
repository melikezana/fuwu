import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
vi.mock("@/lib/logger",()=>({logWarn:vi.fn(),logInfo:vi.fn(),logError:vi.fn()}));
import { ensureProfileForUser } from "@/services/auth/profiles";
describe("profile provisioning ignores untrusted role metadata (stubbed persistence)",()=>{
  it("always provisions a customer from metadata claiming admin/provider",async()=>{
    for(const role of ["admin","provider"]) {
      const insert=vi.fn().mockResolvedValue({error:null});
      const db={from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})}),insert})} as unknown as SupabaseClient<Database>;
      await ensureProfileForUser(db,{id:"fixture-id",user_metadata:{role,is_admin:true,full_name:"<script>fixture</script>"}});
      expect(insert).toHaveBeenCalledWith(expect.objectContaining({id:"fixture-id",role:"customer"}));
    }
  });
  it("never changes an existing role from metadata",async()=>{
    const update=vi.fn().mockReturnValue({eq:async()=>({error:null})});
    const db={from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{id:"fixture-id",full_name:"Existing",phone:null,avatar_url:null},error:null})})}),update})} as unknown as SupabaseClient<Database>;
    await ensureProfileForUser(db,{id:"fixture-id",user_metadata:{role:"admin",is_admin:true}},{fullName:"Changed"});
    expect(update).toHaveBeenCalledWith({full_name:"Changed"});
  });
});
