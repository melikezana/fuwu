import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getServicePhoto, servicePhotos } from "@/lib/service-photos";
import { ServiceIcon } from "@/components/home/ServiceIcon";
import type { CatalogNavigationItem } from "@/lib/commerce/catalog-navigation";

const descriptions: Record<string, string> = {
  plumbing: "Musluk, gider ve su tesisatı",
  electrical: "Priz, aydınlatma ve arıza tespiti",
  cleaning: "Ev ve taşınma sonrası temizlik",
  painting: "Boya, rötuş ve yüzey hazırlığı",
  "climate-appliance-service": "Klima ve beyaz eşya bakımı",
  "furniture-assembly": "Masa, raf ve mobilya kurulumu",
  locksmith: "Kapı ve kilit işlemleri",
  "moving-help": "Küçük eşya ve taşıma desteği",
  "pool-garden": "Bitki, bahçe ve havuz bakımı",
  renovation: "Tamirat ve ev yenileme işleri",
};

export function CategoryCard({ service }: { service: CatalogNavigationItem }) {
  const photo = getServicePhoto(service.id);
  const separateDescription = service.slug === "havuz-bakimi" ? "Havuz temizliği ve rutin bakım" : service.slug === "bahce-bakimi" ? "Bitki bakımı ve bahçe düzenleme" : null;
  return (
    <Link aria-label={`${service.title}: ${service.offerCount ? "hizmetleri incele" : "kapsamı incele, satın alma kapalı"}`} className="home-category-card" href={service.href}>
      <div className="home-category-image">{Object.hasOwn(servicePhotos, service.id) ? <Image alt={photo.alt} className="object-cover" fill sizes="(max-width: 639px) 46vw, (max-width: 1023px) 30vw, 290px" src={photo.src} style={{ objectPosition: photo.position }} /> : <div className="home-category-placeholder"><ServiceIcon name={service.iconName} className="size-12" /></div>}</div>
      <div className="home-category-content">
        <h3 className="home-category-title"><ServiceIcon name={service.iconName} className="size-4 shrink-0" />{service.title}</h3>
        <p className="home-category-description">{separateDescription ?? descriptions[service.id] ?? service.description}</p>
        <span className="home-category-detail">{service.preview ? "Bağlantı bekleniyor" : service.offerCount ? `${service.serviceCount} hizmeti incele` : "Henüz satışa açılmadı"}<ArrowUpRight aria-hidden className="size-4 shrink-0" /></span>
      </div>
    </Link>
  );
}
