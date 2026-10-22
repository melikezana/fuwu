import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Service } from "@/lib/constants/services";
import { getServicePhoto } from "@/lib/service-photos";

export function CategoryCard({ providerCount, service }: { providerCount?: number; service: Service }) {
  const photo = getServicePhoto(service.id);
  return (
    <Link aria-label={service.title + " hizmetlerini inceleyin"} className="home-category-card" href={`/services?category=${service.slug}`}>
      <div className="home-category-image"><Image alt={photo.alt} className="object-cover" fill sizes="(max-width: 639px) 46vw, (max-width: 1023px) 30vw, 230px" src={photo.src} style={{ objectPosition: photo.position }} /></div>
      <div className="home-category-content">
        <span className="home-category-title">{service.title}</span>
        <span className="home-category-detail">{providerCount ? providerCount.toLocaleString("tr-TR") + " usta" : "Hizmeti inceleyin"}<ArrowUpRight aria-hidden="true" className="size-4 shrink-0" /></span>
      </div>
    </Link>
  );
}
