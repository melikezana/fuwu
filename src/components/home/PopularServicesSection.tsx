import Link from "next/link";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { Container } from "@/components/common/Container";
import { SectionIntro } from "@/components/common/SectionIntro";
import { ServiceIcon } from "@/components/home/ServiceIcon";
import { appRoutes, ctaLabels } from "@/constants/navigation";
import type { ServiceIconName } from "@/constants/services";

type PopularService = {
  id: string;
  title: string;
  category: string;
  description: string;
  badge: string;
  detail: string;
  iconName: ServiceIconName;
};

const popularServices: PopularService[] = [
  {
    id: "cleaning",
    title: "Temizlik",
    category: "Ev Bakımı",
    description: "Ev, ofis ve taşınma sonrası temizlik için uygun ustaları karşılaştır.",
    badge: "En çok talep edilen",
    detail: "Dakikalar içinde talep",
    iconName: "sparkles",
  },
  {
    id: "plumbing",
    title: "Tesisat",
    category: "Onarım",
    description: "Kaçak, musluk, gider ve günlük tesisat ihtiyaçları için net açıklama.",
    badge: "Ev onarımı",
    detail: "Hızlı inceleme",
    iconName: "pipe",
  },
  {
    id: "climate-appliance-service",
    title: "Klima & Beyaz Eşya",
    category: "Teknik Servis",
    description: "Klima bakımı, montajı ve beyaz eşya arızaları için uygun teknik servis talebi.",
    badge: "Sezonluk ihtiyaç",
    detail: "Ziyaret planla",
    iconName: "air-conditioner",
  },
  {
    id: "furniture-assembly",
    title: "Mobilya Montajı",
    category: "Montaj",
    description: "Yatak, masa, raf, dolap ve demonte mobilyalar için kurulum desteği.",
    badge: "Taşınmaya uygun",
    detail: "Detayları paylaş",
    iconName: "box",
  },
];

export function PopularServicesSection() {
  return (
    <section className="border-y border-[var(--border)] bg-white" id="popular-services">
      <Container className="py-14 sm:py-16 lg:py-20">
        <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionIntro
            eyebrow="İhtiyacını belirle"
            title="Temizlik, tamir ve teknik destek tek ekranda."
            description="Evde sık ihtiyaç duyulan işleri hızlıca başlat: net kapsam, net zamanlama, güvenli ilk adım."
          />
          <Button className="w-full sm:w-fit" href={appRoutes.services} variant="secondary">
            Hizmetleri İncele
          </Button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4 xl:gap-5">
          {popularServices.map((service) => (
            <Link
              aria-label={`${service.title} için talep oluştur`}
              className="group block h-full rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-orange)] focus-visible:ring-offset-2"
              href={`${appRoutes.request}?service=${encodeURIComponent(service.title)}`}
              key={service.id}
            >
              <Card className="flex h-full min-w-0 flex-col overflow-hidden !p-0 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-[rgba(255,138,0,0.42)] group-hover:shadow-[0_26px_80px_rgba(13,20,36,0.13)]">
                <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] bg-[var(--background)] p-5">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white text-[var(--brand-orange-dark)] ring-1 ring-[rgba(255,138,0,0.24)] transition-colors duration-300 group-hover:bg-[var(--brand-orange)] group-hover:text-[var(--brand-navy)]">
                    <ServiceIcon name={service.iconName} />
                  </span>
                  <span className="rounded-md bg-[var(--brand-orange-soft)] px-3 py-1 text-xs font-bold text-[var(--brand-orange-dark)]">
                    {service.badge}
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <p className="text-sm font-bold text-[var(--muted)]">{service.category}</p>
                  <h3 className="mt-2 text-xl font-bold leading-tight text-[var(--brand-navy)]">
                    {service.title}
                  </h3>
                  <p className="mt-3 flex-1 leading-7 text-[var(--muted)]">
                    {service.description}
                  </p>
                  <div className="mt-5 flex items-center justify-between gap-4 border-t border-[var(--border)] pt-4">
                    <span className="text-sm font-bold text-[var(--brand-navy)]">
                      {service.detail}
                    </span>
                    <span className="shrink-0 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-xs font-bold text-[var(--brand-orange-dark)] transition-colors duration-300 group-hover:border-[var(--brand-orange)] group-hover:bg-[var(--brand-orange)] group-hover:text-[var(--brand-navy)]">
                      Talep Oluştur
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        <div className="mt-8 grid gap-3 rounded-lg border border-[rgba(255,138,0,0.26)] bg-[var(--brand-orange-soft)] p-4 text-[var(--brand-navy)] sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
          <p className="font-bold leading-6">
            Daha özel bir ihtiyacın mı var? Bir kez anlat, Fuwu ihtiyacını netleştirsin.
          </p>
          <Button className="w-full sm:w-fit" href={appRoutes.request}>
            {ctaLabels.request}
          </Button>
        </div>
      </Container>
    </section>
  );
}
