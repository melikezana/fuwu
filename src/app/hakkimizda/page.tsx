import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarCheck2, HandCoins, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { appRoutes } from "@/lib/constants/navigation";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Hakkımızda",
  description: "FUWU, İstanbul'da ev hizmetlerini kapsamı belli, fiyatı açık ve iki taraflı doğrulanmış bir deneyime dönüştürür.",
  path: appRoutes.about,
  keywords: ["FUWU hakkında", "İstanbul ev hizmetleri", "güvenilir usta platformu"],
});

const principles = [
  { icon: ShieldCheck, title: "İki taraflı güven", copy: "Usta da müşteri de doğrulanır. Kapını açtığın kişiyi, ustanın gittiği adresi bilirsin." },
  { icon: HandCoins, title: "Baştan belli fiyat", copy: "Kapsamı yazılı, fiyatı açık hizmet paketleri. Kapıda sürpriz pazarlık yok." },
  { icon: CalendarCheck2, title: "Gerçek müsaitlik", copy: "Ustanın takviminden sana uyan saati seçersin; randevu tahmine değil kayda dayanır." },
  { icon: BadgeCheck, title: "Gerçek yorumlar", copy: "Yorum yalnızca tamamlanmış bir işin ardından yazılabilir." },
];

const story = [
  ["Sorun", "Ev işi için usta bulmak hâlâ tavsiyeye, şansa ve uzun telefon görüşmelerine bağlı. Fiyat belirsiz, gelecek kişi belirsiz, saat belirsiz."],
  ["Yaklaşımımız", "Hizmeti bir ürün gibi tanımlıyoruz: neyin dahil olduğu, ne kadar süreceği ve kaça mal olacağı satın almadan önce belli."],
  ["Hedefimiz", "İstanbul'da her evin, güvendiği bir ustaya birkaç dokunuşla ulaşabilmesi; her ustanın da emeğinin karşılığını adil ve zamanında alması."],
];

export default function AboutPage() {
  return (
    <div className="trust-center">
      <section className="trust-center-hero">
        <Container className="home-container">
          <p className="home-eyebrow"><Sparkles aria-hidden size={16} /> HAKKIMIZDA</p>
          <h1>Ev işi, artık belirsiz değil.</h1>
          <p className="trust-center-lead">FUWU, İstanbul&apos;da ev hizmetlerini kapsamı belli, fiyatı açık ve iki taraflı doğrulanmış bir deneyime dönüştürmek için kuruldu.</p>
          <div className="trust-center-actions">
            <Link className="home-primary-link" href={appRoutes.services}>Hizmetleri Keşfet <ArrowRight aria-hidden size={16} /></Link>
            <Link className="home-text-link" href={appRoutes.providerApplication}>Usta olarak katıl <ArrowRight aria-hidden size={16} /></Link>
          </div>
        </Container>
      </section>

      <section className="home-section trust-center-journey">
        <Container className="home-container">
          <p className="home-eyebrow">NEDEN VARIZ?</p>
          <h2 className="home-section-title">Milyonların her gün yaşadığı bir sorunu çözüyoruz.</h2>
          <ol>{story.map(([title, copy], index) => <li key={title}><span>{String(index + 1).padStart(2, "0")}</span><strong>{title}</strong><p>{copy}</p></li>)}</ol>
        </Container>
      </section>

      <section className="home-section">
        <Container className="home-container trust-center-columns">
          <article className="trust-center-card">
            <p className="home-eyebrow">İLKELERİMİZ</p>
            <h2>Neye söz veriyoruz?</h2>
            <ul>{principles.map(({ icon: Icon, title, copy }) => <li key={title}><Icon aria-hidden size={20} /><div><strong>{title}</strong><p>{copy}</p></div></li>)}</ul>
          </article>
          <article className="trust-center-card">
            <p className="home-eyebrow">NEREDEYİZ?</p>
            <h2>İstanbul&apos;dan başlıyoruz.</h2>
            <ul>
              <li><MapPin aria-hidden size={20} /><div><strong>Hizmet bölgesi</strong><p>İlk aşamada İstanbul ilçelerinde hizmet veriyoruz. Ustalar hizmet verdikleri ilçeleri kendileri belirler.</p></div></li>
              <li><ShieldCheck aria-hidden size={20} /><div><strong>Güven önce gelir</strong><p>Doğrulama adımlarının tamamı <Link href={appRoutes.trustCenter}>Güven Merkezi</Link>&apos;nde açıkça anlatılır.</p></div></li>
            </ul>
            <p className="trust-center-note"><ArrowRight aria-hidden size={16} /> <Link href={appRoutes.contact}>Sorun, öneri ya da iş birliği için bize yaz</Link></p>
          </article>
        </Container>
      </section>
    </div>
  );
}
