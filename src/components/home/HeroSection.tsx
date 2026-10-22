import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, ClipboardCheck, MapPin, SlidersHorizontal } from "lucide-react";
import { HeroSearch } from "@/components/home/HeroSearch";
import { Container } from "@/components/ui/Container";
import { serviceCategories } from "@/lib/constants/services";
import { servicePhotos } from "@/lib/service-photos";

type HeroSectionProps = { categories: string[]; districts: string[] };
const quickServices = ["cleaning", "plumbing", "electrical", "painting"];
const benefits = [
  { icon: SlidersHorizontal, label: "Hizmetleri karşılaştırın" },
  { icon: CalendarDays, label: "Randevunuzu planlayın" },
  { icon: ClipboardCheck, label: "Siparişinizi takip edin" },
];

function ServicePhoto({ serviceId, className = "", priority = false }: {
  serviceId: keyof typeof servicePhotos;
  className?: string;
  priority?: boolean;
}) {
  const photo = servicePhotos[serviceId];
  const service = serviceCategories.find((item) => item.id === serviceId)!;
  return (
    <Link className={"home-hero-photo " + className} href={`/services?category=${service.slug}`}>
      <Image alt={photo.alt} className="object-cover" fill priority={priority}
        sizes={priority ? "(max-width: 767px) 56vw, (max-width: 1023px) 48vw, 340px" : "(max-width: 767px) 38vw, 240px"}
        src={serviceId === "cleaning" ? "/images/services/hero-cleaning.webp" : photo.src} style={{ objectPosition: photo.position }} />
      <span className="home-photo-caption"><span>{service.title}</span><ArrowRight aria-hidden="true" className="size-4 shrink-0" /></span>
    </Link>
  );
}

export function HeroSection({ categories, districts }: HeroSectionProps) {
  return (
    <section aria-labelledby="home-title" className="home-hero">
      <Container className="home-container">
        <div className="home-hero-grid">
          <div className="min-w-0">
            <p className="home-eyebrow"><MapPin aria-hidden="true" className="size-3.5" /> İstanbul’da evinize destek</p>
            <h1 className="home-hero-title" id="home-title">Evin için ihtiyacın olan hizmet, <span>tam zamanında.</span></h1>
            <p className="home-hero-description">Hizmetini seç, ustaları karşılaştır, sana uygun saatte satın al.</p>
            <HeroSearch categories={categories} districts={districts} />
            <div className="fusion-hero-actions"><Link className="commerce-button" href="/services">Hizmetleri Keşfet <ArrowRight size={18} aria-hidden /></Link><Link className="commerce-secondary" href="/providers">Ustaları İncele <ArrowRight size={18} aria-hidden /></Link></div>
            <div aria-label="Sık aranan hizmetler" className="home-quick-services">
              <span>Sık aranan:</span>
              {quickServices.map((id) => {
                const service = serviceCategories.find((item) => item.id === id)!;
                return <Link href={`/services?category=${service.slug}`} key={id}>{service.title}</Link>;
              })}
            </div>
          </div>
          <div aria-label="Ev hizmetlerinden örnekler" className="home-photo-composition">
            <ServicePhoto className="home-photo-main" priority serviceId="cleaning" />
            <ServicePhoto className="home-photo-top" serviceId="painting" />
            <ServicePhoto className="home-photo-bottom" serviceId="plumbing" />
            <span className="fusion-photo-note">Hizmetleri tanıtan stok fotoğraflar</span>
          </div>
        </div>
        <div className="home-benefits" aria-label="FUWU ile hizmet süreci">
          {benefits.map(({ icon: Icon, label }, index) => (
            <div className="home-benefit" key={label}><Icon aria-hidden="true" className="size-5 shrink-0" /><span><small>0{index + 1}</small>{label}</span></div>
          ))}
        </div>
      </Container>
    </section>
  );
}
