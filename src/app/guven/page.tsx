import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CreditCard, FileCheck2, IdCard, KeyRound, Landmark, MessageSquareQuote, PhoneCall, ShieldCheck, UserRound, Wrench } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Güven Merkezi",
  description: "FUWU'da müşteri ve usta nasıl doğrulanır? Kimlik, telefon, belge, güvenli ödeme ve teslim kodu adım adım.",
  path: "/guven",
  keywords: ["güvenilir usta", "doğrulanmış usta", "FUWU güven", "İstanbul usta"],
});

const customerChecks = [
  { icon: PhoneCall, title: "Doğrulanmış hesap", copy: "Google hesabınla ya da telefonuna gelen tek kullanımlık SMS koduyla giriş yaparsın." },
  { icon: CreditCard, title: "3D Secure ödeme", copy: "Kartın, bankanın gönderdiği şifreyle doğrulanır. Ödemesi onaylanmayan randevu kesinleşmez." },
  { icon: UserRound, title: "Adres ve randevu kaydı", copy: "Usta kimin, nereye, ne zaman geleceğini bilir. Belirsiz iş, boşa yol olmaz." },
];

const providerChecks = [
  { icon: IdCard, title: "Kimlik kontrolü", copy: "T.C. kimlik kartı ve ad-soyad eşleşmesi ekibimizce incelenir." },
  { icon: PhoneCall, title: "Telefon doğrulama", copy: "Usta, kendi adına kayıtlı numarasını SMS koduyla doğrular." },
  { icon: FileCheck2, title: "Adli sicil kaydı", copy: "e-Devlet'ten alınan barkodlu belge istenir; barkod ve içerik resmî doğrulama ekranıyla karşılaştırılır." },
  { icon: Wrench, title: "Mesleki belge", copy: "Gereken işlerde ustalık veya mesleki yeterlilik belgesi istenir." },
  { icon: Landmark, title: "Kendi adına hesap", copy: "Kazanç, ödeme kuruluşu tarafından doğrulanan ustanın kendi hesabına aktarılır." },
];

const journey = [
  ["Seçersin", "Hizmeti, ustayı ve saati seçersin. Fiyat baştan belli."],
  ["Güvenle ödersin", "Ödemeni 3D Secure ekranında yaparsın; randevun kesinleşir."],
  ["Usta gelir", "Profilinde gördüğün, doğrulanmış usta kapına gelir."],
  ["Kodla kapatırsın", "İş bitince 6 haneli kodu sen verirsin. Ustanın hak edişi bundan sonra işlenir."],
  ["Değerlendirirsin", "Yorumun, gerçek bir işin ardından herkese yol gösterir."],
];

export default function TrustCenterPage() {
  return (
    <div className="trust-center">
      <section className="trust-center-hero">
        <Container className="home-container">
          <p className="home-eyebrow"><ShieldCheck aria-hidden size={16} /> GÜVEN MERKEZİ</p>
          <h1>Güven, iki taraflı olur.</h1>
          <p className="trust-center-lead">Kapını açtığın usta doğrulanır. Ustanın yola çıktığı iş de doğrulanır. Böylece kimse boşa beklemez, kimse boşa yol gitmez.</p>
          <div className="trust-center-actions">
            <Link className="home-primary-link" href="/services">Hizmetleri Gör <ArrowRight aria-hidden size={16} /></Link>
            <Link className="home-text-link" href="/provider-application">Usta olarak katıl <ArrowRight aria-hidden size={16} /></Link>
          </div>
        </Container>
      </section>

      <section className="home-section">
        <Container className="home-container trust-center-columns">
          <article className="trust-center-card">
            <p className="home-eyebrow">USTA İÇİN</p>
            <h2>Kapına gelen kişiyi tanı.</h2>
            <ul>{providerChecks.map(({ icon: Icon, title, copy }) => <li key={title}><Icon aria-hidden size={20} /><div><strong>{title}</strong><p>{copy}</p></div></li>)}</ul>
            <p className="trust-center-note"><BadgeCheck aria-hidden size={16} /> Profildeki her rozet, yalnızca tamamlanmış bir kontrolü gösterir.</p>
          </article>
          <article className="trust-center-card">
            <p className="home-eyebrow">MÜŞTERİ İÇİN</p>
            <h2>Usta da kime gittiğini bilir.</h2>
            <ul>{customerChecks.map(({ icon: Icon, title, copy }) => <li key={title}><Icon aria-hidden size={20} /><div><strong>{title}</strong><p>{copy}</p></div></li>)}</ul>
            <p className="trust-center-note"><KeyRound aria-hidden size={16} /> Teslim kodu yalnızca sende görünür. Kodu iş bitmeden paylaşma.</p>
          </article>
        </Container>
      </section>

      <section className="home-section trust-center-journey">
        <Container className="home-container">
          <p className="home-eyebrow">KAPIDAN KAPANIŞA</p>
          <h2 className="home-section-title">Her adım kayıt altında.</h2>
          <ol>{journey.map(([title, copy], index) => <li key={title}><span>{String(index + 1).padStart(2, "0")}</span><strong>{title}</strong><p>{copy}</p></li>)}</ol>
        </Container>
      </section>

      <section className="home-section">
        <Container className="home-container trust-center-faq">
          <h2 className="home-section-title"><MessageSquareQuote aria-hidden size={24} /> Akla gelenler</h2>
          <details><summary>Fiyatın içinde neler var?</summary><p>Ustanın işçiliği ve FUWU platform hizmeti. Ödeme ekranında ayrıca ücret eklenmez. Kapsam dışı malzeme gerekirse usta önce sana sorar; onayın olmadan ek ücret alınmaz.</p></details>
          <details><summary>Usta gelmezse ne olur?</summary><p>Siparişinden durumu görür, destek ekibine bildirirsin. İş tamamlanmadıysa teslim kodunu vermezsin; iade süreci sipariş ekranında izlenir.</p></details>
          <details><summary>Belgelerim kimlerle paylaşılır?</summary><p>Belgeler özel ve şifreli bir alanda tutulur. Yalnızca doğrulama ekibi görür; profilinde belge değil, sadece rozet görünür. Ayrıntılar <Link href="/kvkk">KVKK aydınlatma metninde</Link>.</p></details>
          <details><summary>Sorun yaşarsam kime ulaşırım?</summary><p>Sipariş detayındaki destek alanından ya da <Link href="/#contact">iletişim bilgilerimizden</Link> bize yazabilirsin.</p></details>
        </Container>
      </section>
    </div>
  );
}
