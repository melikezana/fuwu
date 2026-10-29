import {expect,it} from "vitest";
import {isAppointmentTimestamp} from "@/lib/commerce/validation";
it("requires a real calendar date and explicit timezone",()=>{
  for(const value of ["2026-10-29T12:00:00+03:00","2026-10-29T09:00:00Z","2028-02-29T12:00:00.123+03:00"]) expect(isAppointmentTimestamp(value)).toBe(true);
  for(const value of ["2026-02-30T12:00:00Z","2026-10-29T24:00:00Z","2026-10-29T12:60:00Z","2026-10-29T12:00:60Z","2026-10-29T12:00:00","10/11/2026",null,{},"2026-13-01T12:00:00Z"]) expect(isAppointmentTimestamp(value)).toBe(false);
});
