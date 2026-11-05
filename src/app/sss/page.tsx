import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, MessageSquareQuote } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { appRoutes } from "@/lib/constants/navigation";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Sık Sorulan Sorular",
  description: "FUWU'da hizmet seçimi, ödeme, usta doğrulama, iptal ve destek hakkında kısa cevaplar.",
  path: appRoutes.faq,
  keywords: ["FUWU sss", "usta nasıl doğrulanır", "ev hizmeti ödeme", "FUWU destek"],
});

type FaqGroup = { title: string; items: Array<{ q: string; a: ReactNode }> };

const groups: FaqGroup[] = [
  {
    title: "Hizmet ve satın alma",
    items: [
      { q: "FUWU nasıl çalışır?", a: <>Hizmetini seçersin, kapsamını ve fiyatını görürsün, ustanın takviminden sana uyan saati alırsın. Adımlar <Link href={appRoutes.howItWorks}>Nasıl Çalışır</Link> bölümünde.</> },
      { q: "Ne zaman satın alabilirim?", a: <>Online satın alma açılış aşamasında. <Link href={appRoutes.waitlist}>Açılış bilgilendirmesine</Link> kaydolursan ilçende hizmet açıldığında ilk sen haberdar olursun.</> },
      { q: "Fiyatın içinde neler var?", a: "Hizmet sayfasında yazan kapsam ve ustanın işçiliği. Kapsam dışı bir iş gerekirse usta önce sana sorar; onayın olmadan ek ücret çıkmaz." },
      { q: "Hangi ilçelerde hizmet var?", a: <>İstanbul ilçelerinde. <Link href={appRoutes.services}>Hizmetler</Link> sayfasında ilçeni seçerek o bölgede çalışan ustaları görebilirsin.</> },
    ],
  },
  {
    title: "Güven ve doğrulama",
    items: [
      { q: "Ustalar kontrol ediliyor mu?", a: <>Evet. Kimlik, telefon ve gerektiğinde mesleki belgeler ekibimizce incelenir. Ayrıntılar <Link href={appRoutes.trustCenter}>Güven Merkezi</Link>&apos;nde.</> },
      { q: "Belgelerim kimlerle paylaşılır?", a: <>Belgeler özel bir alanda saklanır ve yalnızca doğrulama ekibi görür. Profilinde belge değil, yalnızca rozet görünür. Ayrıntılar <Link href={appRoutes.kvkk}>KVKK aydınlatma metninde</Link>.</> },
      { q: "Yorumlar gerçek mi?", a: "Yorum yalnızca tamamlanmış bir siparişin ardından, o siparişi veren müşteri tarafından yazılabilir." },
    ],
  },
  {
    title: "Sipariş, iptal ve destek",
    items: [
      { q: "Siparişimi nasıl takip ederim?", a: <>Giriş yaptıktan sonra <Link href={appRoutes.orders}>Siparişlerim</Link> ekranından durumunu, ustayla yazışmanı ve teslim kodunu görürsün.</> },
      { q: "Usta gelmezse ne olur?", a: "Sipariş ekranındaki “Sorun Bildir” alanından kayıt oluşturursun. İş tamamlanmadıysa teslim kodunu vermezsin; iade süreci sipariş ekranında izlenir." },
      { q: "Sorun yaşarsam kime ulaşırım?", a: <>Sipariş detayındaki destek alanından ya da <Link href={appRoutes.contact}>iletişim formundan</Link> bize yazabilirsin.</> },
    ],
  },
  {
    title: "Ustalar için",
    items: [
      { q: "Nasıl usta olurum?", a: <><Link href={appRoutes.providerApplication}>Usta Ol</Link> formunu doldurursun. Başvurun ve belgelerin incelendikten sonra profilin ve hizmet mağazan yayına alınır.</> },
      { q: "Kazancımı nasıl alırım?", a: "İş tamamlanıp müşteri teslim kodunu verdikten sonra hak edişin ödeme kuruluşu üzerinden kendi adına doğrulanmış hesabına aktarılır." },
    ],
  },
];

export default function FaqPage() {
  return (
    <div className="trust-center">
      <section className="trust-center-hero">
        <Container className="home-container">
          <p className="home-eyebrow"><MessageSquareQuote aria-hidden size={16} /> SIK SORULAN SORULAR</p>
          <h1>Akla gelenler, kısa cevaplar.</h1>
          <p className="trust-center-lead">Aradığın cevabı bulamazsan bize yaz; destek ekibimiz döner.</p>
          <div className="trust-center-actions">
            <Link className="home-primary-link" href={appRoutes.contact}>Bize Yaz <ArrowRight aria-hidden size={16} /></Link>
            <Link className="home-text-link" href={appRoutes.services}>Hizmetleri Keşfet <ArrowRight aria-hidden size={16} /></Link>
          </div>
        </Container>
      </section>
      {groups.map(group => (
        <section className="home-section" key={group.title}>
          <Container className="home-container trust-center-faq">
            <h2 className="home-section-title">{group.title}</h2>
            {group.items.map(item => <details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}
          </Container>
        </section>
      ))}
    </div>
  );
}
