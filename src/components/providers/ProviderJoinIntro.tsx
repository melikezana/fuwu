import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, ClipboardList, UserRound, ChevronDown } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { serviceCategories } from "@/lib/constants/services";
import { servicePhotos } from "@/lib/service-photos";

const benefits = [
  { icon: UserRound, title: "Uzmanlığınız görünür olsun", copy: "Hizmetlerinizi, çalışma bölgelerinizi ve iş fotoğraflarınızı kendi profilinizde tanıtın." },
  { icon: ClipboardList, title: "Talepler tek yerde toplansın", copy: "Size yönlendirilen işlerin detaylarını inceleyin, müşterilerinizle süreci panelinizden takip edin." },
  { icon: CalendarDays, title: "İşinizi kendiniz planlayın", copy: "Müsaitliğinizi ve hizmet bölgenizi belirtin; size uygun talepleri değerlendirin." },
];

export function ProviderJoinIntro() {
  return <>
    <section className="market-join-hero"><Container className="max-w-7xl market-join-grid">
      <div className="min-w-0"><p className="market-eyebrow">FUWU’DA HİZMET VERİN</p><h1>Uzmanlığını daha fazla müşteriye ulaştır.</h1><p className="market-join-description">FUWU’da profilini oluştur, hizmetlerini tanıt ve sana uygun iş taleplerini değerlendir.</p><a className="home-primary-link" href="#provider-application-form">Usta Olarak Başvur <ArrowRight aria-hidden="true" className="size-4 shrink-0" /></a><p className="market-help-text">Başvurunuzu tamamlayın, inceleme durumunu hesabınızdan takip edin.</p></div>
      <figure className="market-join-photo"><Image alt={servicePhotos.painting.alt} fill priority sizes="(max-width: 767px) 92vw, 550px" className="object-cover" src="/images/services/provider-painting.webp" /><figcaption>İşinizi özenle yapın.<br /><strong>Hizmetinizi FUWU’da tanıtın.</strong></figcaption></figure>
    </Container></section>
    <section className="market-join-benefits"><Container className="max-w-7xl"><div className="market-join-benefit-grid">{benefits.map(({ icon: Icon, title, copy }) => <div key={title}><Icon aria-hidden="true" className="size-6" /><h2>{title}</h2><p>{copy}</p></div>)}</div></Container></section>
  </>;
}

export function ProviderJoinDetails() {
  const questions = [
    ["Başvurudan sonra ne olur?", "Başvurunuz incelemeye alınır. Durumunu hesabınızın Başvurularım bölümünden izleyebilirsiniz. Onaylandıktan sonra usta panelinize erişebilirsiniz."],
    ["Profilimde hangi bilgiler görünür?", "Hizmet kategoriniz, çalışma bölgeniz, tanıtımınız ve paylaştığınız iş fotoğrafları profilinizde yer alır. Yalnızca tamamlanan doğrulamalar için ilgili rozet gösterilir."],
    ["Başvurmak iş garantisi sağlar mı?", "Başvuru veya profil oluşturma, belirli sayıda iş ya da kazanç garantisi vermez. Talepler bölge, kategori ve müşteri ihtiyaçlarına göre değişir."],
    ["Hangi alanlarda başvurabilirim?", "Güncel hizmet alanlarını aşağıda inceleyebilirsiniz. Başvuru formunda kullanılabilir kategoriler ve ilçeler gösterilir."],
  ];
  return <section className="market-join-details"><Container className="max-w-7xl"><div className="market-join-detail-grid"><div><p className="market-eyebrow">UZMANLIĞINIZA YER VAR</p><h2>Hangi alanda hizmet veriyorsunuz?</h2><div className="market-area-tags">{serviceCategories.map(service => <Link href={service.href} key={service.id}>{service.title}<ArrowRight aria-hidden="true" className="size-3.5 shrink-0" /></Link>)}</div></div><div><p className="market-eyebrow">AKLINIZDA SORU KALMASIN</p><h2>Sık sorulan sorular</h2><div className="home-faq-items">{questions.map(([q, a]) => <details key={q}><summary><span>{q}</span><ChevronDown aria-hidden="true" className="size-5 shrink-0" /></summary><p>{a}</p></details>)}</div></div></div></Container></section>;
}
