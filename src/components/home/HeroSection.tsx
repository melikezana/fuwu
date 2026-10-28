import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, MapPin, ShieldCheck, WalletCards } from "lucide-react";
import { HeroSearch } from "@/components/home/HeroSearch";
import { ServiceIcon } from "@/components/home/ServiceIcon";
import { Container } from "@/components/ui/Container";
import type { CatalogNavigationItem } from "@/lib/commerce/catalog-navigation";
import { servicePhotos } from "@/lib/service-photos";
import { featuredCategories } from "@/lib/commerce/catalog-navigation";

const photos = [
  { id: "plumbing", title: "Tesisat", className: "home-photo-main" },
  { id: "cleaning", title: "Temizlik", className: "home-photo-top" },
  { id: "electrical", title: "Elektrik", className: "home-photo-electric" },
  { id: "painting", title: "Boya badana", className: "home-photo-bottom" },
] as const;
const benefits = [
  { icon: ShieldCheck, label: "Profil ve yorumları karşılaştır" },
  { icon: WalletCards, label: "Fiyatı önceden gör" },
  { icon: CalendarDays, label: "Gün ve saatini sen seç" },
];

export function HeroSection({ categories, districts }: { categories: CatalogNavigationItem[]; districts: string[] }) {
  return (
    <section aria-labelledby="home-title" className="home-hero">
      <Container className="home-container">
        <div className="home-hero-grid">
          <div className="home-hero-content">
            <p className="home-eyebrow"><MapPin aria-hidden size={14} /> İSTANBUL’DA, EVİN İÇİN</p>
            <h1 className="home-hero-title" id="home-title">Evin için ne gerekiyorsa, <span>FUWU’da.</span></h1>
            <p className="home-hero-description">Ustanı seç, fiyatını gör, zamanını belirle. Gerisini kolayca hallet.</p>
            <HeroSearch categories={categories.map(category => category.title)} districts={districts} />
            {categories.length > 0 && <nav aria-label="Hızlı kategori seçimi" className="home-quick-categories">
              {featuredCategories(categories).map(category => <Link href={category.href} key={category.slug}><ServiceIcon name={category.iconName} className="size-4 shrink-0" /><span>{category.title}</span><ArrowUpRight size={14} aria-hidden /></Link>)}
              <Link href="/services">Tüm Hizmetleri Gör <ArrowUpRight size={14} aria-hidden /></Link>
            </nav>}
          </div>
          <figure className="home-photo-composition">
            {photos.map(({ id, title, className }, index) => {
              const photo = servicePhotos[id];
              return <div className={`home-hero-photo ${className}`} key={id}>
                <Image alt={photo.alt} className="object-cover" fill preload={index === 0} sizes="(max-width: 767px) 46vw, (max-width: 1023px) 40vw, 300px" src={index === 0 ? "/images/services/hero-plumbing.webp" : photo.src} style={{ objectPosition: photo.position }} />
                <span className="home-photo-caption">{title}</span>
              </div>;
            })}
            <figcaption className="home-photo-credit">Gerçek işler, özenli hizmet. Fotoğraflar hizmetleri temsil eder.</figcaption>
          </figure>
        </div>
        <div className="home-benefits" aria-label="FUWU ile hizmet süreci">{benefits.map(({ icon: Icon, label }) => <div className="home-benefit" key={label}><Icon aria-hidden className="size-5 shrink-0" /><span>{label}</span></div>)}</div>
        <p className="home-payment-note">Ödemeler şu anda iyzico test ortamındadır. Gerçek tahsilat yapılmaz.</p>
      </Container>
    </section>
  );
}
