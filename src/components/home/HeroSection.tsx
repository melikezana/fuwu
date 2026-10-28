import Image from "next/image";
import { MapPin } from "lucide-react";
import { HeroSearch } from "@/components/home/HeroSearch";
import { Container } from "@/components/ui/Container";
import type { CatalogNavigationItem } from "@/lib/commerce/catalog-navigation";
import { servicePhotos } from "@/lib/service-photos";

const photos = [
  { id: "plumbing", title: "Tesisat", className: "home-photo-main" },
  { id: "cleaning", title: "Temizlik", className: "home-photo-top" },
  { id: "electrical", title: "Elektrik", className: "home-photo-electric" },
  { id: "painting", title: "Boya badana", className: "home-photo-bottom" },
] as const;

export function HeroSection({ categories, districts }: { categories: CatalogNavigationItem[]; districts: string[] }) {
  return (
    <section aria-labelledby="home-title" className="home-hero">
      <Container className="home-container">
        <div className="home-hero-grid">
          <div className="home-hero-content">
            <p className="home-eyebrow"><MapPin aria-hidden size={16} /> İSTANBUL’DA EV HİZMETLERİ</p>
            <h1 className="home-hero-title" id="home-title">Evinin işi,<br /><span>FUWU&apos;nun işi.</span></h1>
            <p className="home-hero-description">Doğru usta. Net fiyat. Kolay randevu.</p>
            <HeroSearch categories={categories.map(category => category.title)} districts={districts} />
          </div>
          <figure className="home-photo-composition">
            {photos.map(({ id, title, className }, index) => {
              const photo = servicePhotos[id];
              return <div className={`home-hero-photo ${className}`} key={id}>
                <Image alt={photo.alt} className="object-cover" fill loading={index === 0 ? "eager" : "lazy"} sizes="(max-width: 767px) 1px, (max-width: 1023px) 40vw, 300px" src={index === 0 ? "/images/services/hero-plumbing.webp" : photo.src} style={{ objectPosition: photo.position }} />
                <span className="home-photo-caption">{title}</span>
              </div>;
            })}
            <figcaption className="home-photo-credit">Hizmetleri tanıtan temsili stok fotoğraflar.</figcaption>
          </figure>
        </div>
      </Container>
    </section>
  );
}
