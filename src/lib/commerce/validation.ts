// An unambiguous instant with an explicit timezone; Date.parse alone accepts
// rollover dates and locale-dependent strings such as 10/11/2026.
export function isAppointmentTimestamp(value: unknown): value is string {
  if(typeof value !== "string") return false;
  const match=/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if(!match || Number(match[2])>23 || Number(match[3])>59 || Number(match[4])>59) return false;
  const day=new Date(`${match[1]}T12:00:00Z`);
  return Number.isFinite(day.getTime()) && day.toISOString().slice(0,10)===match[1] && Number.isFinite(Date.parse(value));
}
