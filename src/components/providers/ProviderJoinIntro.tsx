import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, ClipboardList, UserRound, ChevronDown } from "lucide-react";
import { Container } from "@/components/ui/Container";

import { servicePhotos } from "@/lib/service-photos";

const benefits = [
  { icon: UserRound, title: "Teklif için ücret yok.", copy: "Standart hizmetlerini paket olarak sun." },
  { icon: ClipboardList, title: "Fiyatını sen belirle.", copy: "Kapsamını, ücretini ve çalışma bölgeni seç." },
  { icon: CalendarDays, title: "Takvimin senin kontrolünde.", copy: "Uygun olduğun gün ve saatleri aç." },
];

export function ProviderJoinIntro() {
  return <>
    <section className="market-join-hero"><Container className="max-w-7xl market-join-grid">
      <div className="min-w-0"><p className="market-eyebrow">FUWU PARTNER</p><h1>Ustalığın işe dönüşsün.</h1><p className="market-join-description">Hizmetlerini sun. Takvimini yönet. Kazancını takip et.</p><a className="home-primary-link" href="#provider-application-form">Usta Ol <ArrowRight aria-hidden="true" className="size-4 shrink-0" /></a><p className="market-help-text">Başvurunu hesabından takip edebilirsin.</p></div>
      <figure className="market-join-photo"><Image alt={servicePhotos.painting.alt} fill preload sizes="(max-width: 767px) 92vw, 550px" className="object-cover" src="/images/services/provider-painting.webp" /><figcaption>İşinin ustası ol.<br /><strong>Fotoğraf hizmeti temsil eder.</strong></figcaption></figure>
    </Container></section>
    <section className="market-join-benefits"><Container className="max-w-7xl"><div className="market-join-benefit-grid">{benefits.map(({ icon: Icon, title, copy }) => <div key={title}><Icon aria-hidden="true" className="size-6" /><h2>{title}</h2><p>{copy}</p></div>)}</div></Container></section>
  </>;
}

export function ProviderJoinDetails({ categories }: { categories: { id: string; name: string }[] }) {
  const questions = [
    ["Başvurudan sonra ne olur?", "Başvurunu hesabından izle. Onaydan sonra hizmet paketini ve takvimini tamamla. Profilin ayrıca yayın incelemesinden geçer."],
    ["Komisyon nasıl uygulanır?", "Başlangıç usta komisyonu %10 olarak yapılandırılmıştır. İşlemde geçerli komisyon, ödeme kuruluşu kesintisi ve net kazanç panelinde ayrı gösterilir. Başvuru ve teklif gönderme ücreti alınmaz."],
    ["Profilimde hangi bilgiler görünür?", "Uzmanlığın, çalışma bölgen ve paylaştığın iş fotoğrafları. Rozetler yalnızca tamamlanan kontrolleri gösterir."],
    ["Başvurmak iş garantisi sağlar mı?", "Hayır. İş ve kazanç garantisi verilmez. Siparişler bölge, hizmet ve müşteri ihtiyacına göre değişir."],
    ["Hangi alanlarda başvurabilirim?", "Başvuru formundaki güncel hizmetleri ve ilçeleri inceleyebilirsin."],
  ];
  return <section className="market-join-details"><Container className="max-w-7xl"><div className="market-join-detail-grid"><div><p className="market-eyebrow">UZMANLIĞINA YER VAR</p><h2>Hangi alanda uzmansın?</h2><div className="market-area-tags">{categories.map(service => <Link href="#provider-application-form" key={service.id}>{service.name}<ArrowRight aria-hidden="true" className="size-3.5 shrink-0" /></Link>)}</div></div><div><p className="market-eyebrow">BAŞVURU HAKKINDA</p><h2>Sık sorulan sorular</h2><div className="home-faq-items">{questions.map(([q, a]) => <details key={q}><summary><span>{q}</span><ChevronDown aria-hidden="true" className="size-5 shrink-0" /></summary><p>{a}</p></details>)}</div></div></div></Container></section>;
}
