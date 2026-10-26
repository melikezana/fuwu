import Image from "next/image";
import Link from "next/link";
import { AirVent, ArrowUpRight, Droplets, Hammer, KeyRound, PaintRoller, Sparkles, Sprout, Truck, Wrench, Zap } from "lucide-react";
import type { Service } from "@/lib/constants/services";
import { getServicePhoto } from "@/lib/service-photos";

export function CategoryCard({ providerCount, service }: { providerCount?: number; service: Service }) {
  const photo = getServicePhoto(service.id);
  const Icon = ({ cleaning: Sparkles, plumbing: Droplets, electrical: Zap, painting: PaintRoller, "climate-appliance-service": AirVent, locksmith: KeyRound, "furniture-assembly": Hammer, "moving-help": Truck, "pool-garden": Sprout } as Record<string, typeof Wrench>)[service.id] || Wrench;
  return (
    <Link aria-label={service.title + " hizmetlerini inceleyin"} className="home-category-card" href={`/services?category=${service.slug}`}>
      <div className="home-category-image"><Image alt={photo.alt} className="object-cover" fill sizes="(max-width: 639px) 46vw, (max-width: 1023px) 30vw, 230px" src={photo.src} style={{ objectPosition: photo.position }} /></div>
      <div className="home-category-content">
        <span className="home-category-title"><Icon size={18} aria-hidden />{service.title}</span>
        <span className="home-category-detail">{providerCount ? providerCount.toLocaleString("tr-TR") + " usta" : "Hizmeti inceleyin"}<ArrowUpRight aria-hidden="true" className="size-4 shrink-0" /></span>
      </div>
    </Link>
  );
}
