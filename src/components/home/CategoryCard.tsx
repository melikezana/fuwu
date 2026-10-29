import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ServicePhoto } from "@/components/ui/ServicePhoto";
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

export function CategoryCard({ service, preload = false, discoveryOnly = false }: { service: CatalogNavigationItem; preload?: boolean; discoveryOnly?: boolean }) {
  const separateDescription = service.slug === "havuz-bakimi" ? "Havuz temizliği ve rutin bakım" : service.slug === "bahce-bakimi" ? "Bitki bakımı ve bahçe düzenleme" : null;
  return (
    <Link className="home-category-card" href={service.href} prefetch={false}>
      <div className="home-category-image"><ServicePhoto keys={[service.slug, service.id]} label={service.title} preload={preload} sizes="(max-width: 359px) 100px, (max-width: 639px) 46vw, (max-width: 1023px) 30vw, 290px" /></div>
      <div className="home-category-content">
        <h3 className="home-category-title"><ServiceIcon name={service.iconName} className="size-4 shrink-0" />{service.title}</h3>
        <p className="home-category-description">{separateDescription ?? descriptions[service.id] ?? service.description}</p>
        <span className="home-category-detail">{discoveryOnly ? "Hizmetleri keşfet" : service.preview ? "Bağlantı bekleniyor" : service.offerCount ? `${service.serviceCount} hizmeti incele` : "Henüz satışa açılmadı"}<ArrowUpRight aria-hidden className="size-4 shrink-0" /></span>
      </div>
    </Link>
  );
}
