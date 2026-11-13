import { getHomeCarePlan } from "@/lib/home-care/seasonal-plan";
import { kindFromCategorySlug, type JobKind } from "@/lib/jobs/job-kit";

export type SeasonSignal = { month: string; title: string; why: string; upcoming: boolean };

/** Ustanın türleriyle eşleşen mevsimsel işler (bu ay + sonraki iki ay). Ağ çağrısı yapmaz. */
export function seasonSignals(kinds: JobKind[], now: Date = new Date()): SeasonSignal[] {
  const wanted = new Set<JobKind>(kinds.filter(kind => kind !== "genel"));
  if (!wanted.size) return [];
  return getHomeCarePlan(now, 2).flatMap((month, index) => month.tasks
    .filter(task => task.categorySlug && wanted.has(kindFromCategorySlug(task.categorySlug)))
    .map(task => ({ month: month.label, title: task.title, why: task.why, upcoming: index > 0 })));
}
