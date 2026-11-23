import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, MapPin } from "lucide-react";
import { DemoBadge } from "@/components/demo/DemoBadge";
import type { DemoProvider } from "@/lib/demo/providers";

export function demoProfileHref(provider: Pick<DemoProvider, "slug">) {
  return `/ornek-profiller/${provider.slug}`;
}

/** Örnek profil kartı: puan, yorum ve fiyat göstermez; "Örnek profil" etiketi her zaman görünür. */
export function DemoProviderCard({ provider, priority = false }: { provider: DemoProvider; priority?: boolean }) {
  const href = demoProfileHref(provider);
  return (
    <article aria-labelledby={`demo-${provider.slug}-title`} className="demo-card">
      <Link className="demo-card-photo" href={href} tabIndex={-1} aria-hidden>
        <Image alt="" className="object-cover" fill priority={priority} sizes="(max-width: 639px) 92vw, (max-width: 1023px) 45vw, 360px" src={provider.portrait} />
        <DemoBadge className="demo-card-badge" />
      </Link>
      <div className="demo-card-body">
        <p className="demo-card-trade">{provider.trade}</p>
        <h3 id={`demo-${provider.slug}-title`}><Link href={href}>{provider.name}</Link></h3>
        <p className="demo-card-headline">{provider.headline}</p>
        <ul className="demo-card-facts">
          <li><MapPin aria-hidden size={15} />{provider.serviceAreas.join(" · ")}</li>
          <li><BriefcaseBusiness aria-hidden size={15} />{provider.experienceYears} yıl deneyim <span>(örnek bilgi)</span></li>
        </ul>
        <Link className="demo-card-link" href={href}>Örnek profili incele <ArrowUpRight aria-hidden size={16} /></Link>
      </div>
    </article>
  );
}
