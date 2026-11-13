import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarDays, ChevronDown, CircleCheck, CircleDashed, Coins, Handshake } from "lucide-react";
import { ProviderEarningsCalculator } from "@/components/providers/ProviderEarningsCalculator";
import { Container } from "@/components/ui/Container";

import { servicePhotos } from "@/lib/service-photos";

// Ustaların diğer platformlardaki en sık şikâyetlerine (teklif ücreti, bakiye, pazarlık,
// dönmeyen müşteri, açıklamasız hesap kapatma) birebir cevap verir.
const benefits = [
  { icon: Coins, title: "Teklif parası yok.", copy: "Bakiye yüklemezsin. Sadece biten işten %10 komisyon." },
  { icon: Handshake, title: "Pazarlık yok, boş yol yok.", copy: "Sipariş sana, müşteri fiyatı görüp ödemeyi yaptıktan sonra düşer." },
  { icon: CalendarDays, title: "Takvim senin.", copy: "Hangi gün, hangi saat, hangi ilçe; sen açarsın." },
  { icon: BadgeCheck, title: "Şeffaf onay.", copy: "Eksik belge varsa neyin eksik olduğunu açıkça görürsün. Habersiz hesap kapatma yok." },
];

const documents = {
  required: [
    ["T.C. kimlik kartı", "Ön ve arka yüz, okunaklı fotoğraf ya da PDF."],
    ["Adli sicil kaydı", "e-Devlet'ten barkodlu, son 3 ay içinde alınmış."],
    ["Kendi adına banka hesabı", "Kazancın ödeme kuruluşunca doğrulanan bu hesaba geçer."],
  ],
  byCategory: [
    ["Elektrik, doğal gaz, klima", "Mesleki Yeterlilik (MYK) veya ustalık belgesi."],
    ["Yetkili servis işleri", "Markanın verdiği yetki belgesi."],
    ["Şirket veya esnafsan", "Vergi levhası ya da esnaf kaydı."],
  ],
  optional: [
    ["İş fotoğrafların", "Önce/sonra fotoğrafları profilini öne çıkarır."],
    ["Ustalık / kalfalık belgesi", "Zorunlu olmayan işlerde de güven rozeti kazandırır."],
  ],
} as const;

export function ProviderJoinIntro() {
  return <>
    <section className="market-join-hero"><Container className="max-w-7xl market-join-grid">
      <div className="min-w-0"><p className="market-eyebrow">FUWU PARTNER</p><h1>Teklif için değil,<br />iş için öde.</h1><p className="market-join-description">Müşteri seni seçer, ödemesini yapar, randevu kesinleşir. Sen işini yaparsın. Komisyon yalnızca biten işten.</p><a className="home-primary-link" href="#provider-application-form">Usta Ol <ArrowRight aria-hidden="true" className="size-4 shrink-0" /></a><p className="market-help-text">Açılış öncesi dönemdeyiz: ilk usta ağını kuruyoruz. Siparişler online satış açıldığında başlar; başvurunu ve durumunu hesabından takip edersin.</p></div>
      <figure className="market-join-photo"><Image alt={servicePhotos.painting.alt} fill preload sizes="(max-width: 767px) 92vw, 550px" className="object-cover" src="/images/services/provider-painting.webp" /></figure>
    </Container></section>
    <section className="market-join-benefits"><Container className="max-w-7xl"><div className="market-join-benefit-grid is-four">{benefits.map(({ icon: Icon, title, copy }) => <div key={title}><Icon aria-hidden="true" className="size-6" /><h2>{title}</h2><p>{copy}</p></div>)}</div></Container></section>
  </>;
}

export function ProviderJoinDetails({ categories }: { categories: { id: string; name: string }[] }) {
  const questions = [
    ["Paramı ne zaman alırım?", "Müşteri ödemeyi randevu öncesi yapar. İşi bitirip müşterinin teslim kodunu girdiğinde hak edişin onaylanır ve ödeme kuruluşu üzerinden hesabına aktarılır."],
    ["Başvurudan sonra ne olur?", "Başvurunu hesabından izle. Onaydan sonra hizmet paketini ve takvimini tamamla. Profilin ayrıca yayın incelemesinden geçer."],
    ["Komisyon nasıl uygulanır?", "Başvuru, teklif ve üyelik ücretsizdir. Yalnızca tamamlanan işten başlangıçta %10 komisyon alınır. Komisyon, ödeme kuruluşu kesintisi ve net kazancın panelinde ayrı ayrı görünür."],
    ["Profilimde hangi bilgiler görünür?", "Uzmanlığın, çalışma bölgen ve paylaştığın iş fotoğrafları. Rozetler yalnızca tamamlanan kontrolleri gösterir."],
    ["Başvurmak iş garantisi sağlar mı?", "Hayır. İş ve kazanç garantisi verilmez. Siparişler bölge, hizmet ve müşteri ihtiyacına göre değişir."],
    ["Hangi alanlarda başvurabilirim?", "Başvuru formundaki güncel hizmetleri ve ilçeleri inceleyebilirsin."],
  ];
  return <section className="market-join-details"><Container className="max-w-7xl"><div className="provider-join-tools"><ProviderEarningsCalculator /><section aria-labelledby="docs-title" className="provider-docs"><h2 id="docs-title">Hazırlaman gerekenler</h2><p>Belgeler özel alanda saklanır; profilinde yalnızca rozet görünür.</p><h3><CircleCheck aria-hidden size={18} /> Herkesten</h3><ul>{documents.required.map(([t, c]) => <li key={t}><strong>{t}</strong><span>{c}</span></li>)}</ul><h3><BadgeCheck aria-hidden size={18} /> İşine göre</h3><ul>{documents.byCategory.map(([t, c]) => <li key={t}><strong>{t}</strong><span>{c}</span></li>)}</ul><h3><CircleDashed aria-hidden size={18} /> İstersen</h3><ul>{documents.optional.map(([t, c]) => <li key={t}><strong>{t}</strong><span>{c}</span></li>)}</ul><Link className="home-text-link" href="/guven">Doğrulama nasıl işler? <ArrowRight aria-hidden className="size-4" /></Link></section></div><div className="market-join-detail-grid"><div><p className="market-eyebrow">UZMANLIĞINA YER VAR</p><h2>Hangi alanda uzmansın?</h2><div className="market-area-tags">{categories.map(service => <Link href="#provider-application-form" key={service.id}>{service.name}<ArrowRight aria-hidden="true" className="size-3.5 shrink-0" /></Link>)}</div></div><div><p className="market-eyebrow">BAŞVURU HAKKINDA</p><h2>Sık sorulan sorular</h2><div className="home-faq-items">{questions.map(([q, a]) => <details key={q}><summary><span>{q}</span><ChevronDown aria-hidden="true" className="size-5 shrink-0" /></summary><p>{a}</p></details>)}</div></div></div></Container></section>;
}
