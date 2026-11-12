import Link from "next/link";
import { CalendarHeart } from "lucide-react";
import { getHomeCarePlan, homeCareCategoryHref } from "@/lib/home-care/seasonal-plan";

/** Müşteri panelinde bu ayın ve gelecek ayın ev bakım hatırlatmaları. Sipariş olmasa da işe yarar. */
export function HomeCarePlan({ now }: { now?: Date }) {
  const [current, next] = getHomeCarePlan(now, 1);
  return (
    <section className="commerce-panel home-care-plan" aria-labelledby="home-care-title">
      <h2 id="home-care-title"><CalendarHeart aria-hidden size={22} /> Ev bakım takvimi · {current.label}</h2>
      <p className="commerce-help">İstanbul&apos;da bu ay evin için sırası gelen işler. Sorun çıkmadan önce bakmak, arızadan sonra çağırmaktan ucuzdur.</p>
      <ul>
        {current.tasks.map(item => (
          <li key={item.id}>
            <strong>{item.title}</strong>
            <span>{item.why}</span>
            {item.categorySlug && <Link href={homeCareCategoryHref(item.categorySlug)}>Hizmetin kapsamını incele</Link>}
          </li>
        ))}
      </ul>
      <p className="commerce-help">Gelecek ay ({next.label}): {next.tasks.map(item => item.title).join(" · ")}.</p>
    </section>
  );
}
