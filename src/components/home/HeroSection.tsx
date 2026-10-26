import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Check, Headphones, MapPin, ShieldCheck, WalletCards } from "lucide-react";
import { HeroSearch } from "@/components/home/HeroSearch";
import { Container } from "@/components/ui/Container";
import { serviceCategories } from "@/lib/constants/services";
import { servicePhotos } from "@/lib/service-photos";

type HeroSectionProps = { categories: string[]; districts: string[] };
const quickServices = ["cleaning", "plumbing", "electrical", "painting"];
const benefits = [
  { icon: ShieldCheck, label: "Doğrulama bilgileri açık" },
  { icon: WalletCards, label: "Güvenli ödeme" },
  { icon: CalendarDays, label: "Sana uygun randevu" },
  { icon: Headphones, label: "Sipariş boyunca destek" },
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
        sizes={priority ? "(max-width: 767px) 400px, 800px" : "(max-width: 767px) 50vw, 440px"}
        src={photo.src} style={{ objectPosition: photo.position }} />
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
            <p className="home-eyebrow"><span className="home-location-dot" /><MapPin aria-hidden="true" className="size-3.5" /> İstanbul’da, evin için.</p>
            <h1 className="home-hero-title" id="home-title">Evinin her işi,<br /><span>usta ellerde.</span></h1>
            <p className="home-hero-description">Doğru usta, net fiyat, seçtiğin gün ve saat.<br />Evin için gereken hizmeti güvenle satın al.</p>
            <HeroSearch categories={categories} districts={districts} />
            <div className="home-secondary-actions"><Link href="/providers">Usta Bul <ArrowRight size={16} aria-hidden /></Link><span aria-hidden="true" /><Link href="/provider-application">İşinin ustası mısın? <strong>Usta Ol</strong><ArrowRight size={16} aria-hidden /></Link></div>
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
            <div className="home-plan-card"><span className="home-plan-icon"><CalendarDays size={23} aria-hidden /></span><div><strong>Sen planla. Ustası halletsin.</strong><p>Hizmet, usta ve randevu tek yerde.</p></div><span className="home-plan-check"><Check size={18} aria-hidden /></span></div>
            <span className="fusion-photo-note">Hizmetleri tanıtan temsili fotoğraflar</span>
          </div>
        </div>
        <div className="home-benefits" aria-label="FUWU ile hizmet süreci">
          {benefits.map(({ icon: Icon, label }) => (
            <div className="home-benefit" key={label}><Icon aria-hidden="true" className="size-5 shrink-0" /><span>{label}</span></div>
          ))}
        </div>
      </Container>
    </section>
  );
}
