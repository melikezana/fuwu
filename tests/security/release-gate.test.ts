import { describe,expect,it } from "vitest";
import { evaluateRelease } from "../../scripts/testing/evidence.mjs";
describe("release never passes absent or skipped tests",()=>{
  it("blocks an empty evidence directory",()=>{expect(evaluateRelease({},"hash").status).toBe("BLOCKED");});
  it("rejects forged PASS for zero/skipped tests and stale source",()=>{
    for(const patch of [{passed:0},{skipped:1},{executed:false},{sourceHash:"old"},{completedAt:"invalid"}]) {
      const r={status:"PASS",sourceHash:"hash",completedAt:new Date().toISOString(),executed:true,passed:1,failed:0,skipped:0,...patch};
      expect(evaluateRelease({unit:r},"hash").gates.find(g=>g.name==="unit")?.status).toBe("BLOCKED");
    }
  });
  it("preserves FAIL and SKIP instead of converting them to PASS",()=>{
    const record={sourceHash:"hash",completedAt:new Date().toISOString(),executed:true,passed:1,failed:0,skipped:0};
    expect(evaluateRelease({unit:{...record,status:"FAIL"}},"hash").status).toBe("FAIL");
    expect(evaluateRelease({unit:{...record,status:"SKIP"}},"hash").gates.find(g=>g.name==="unit")?.status).toBe("SKIP");
  });
});
