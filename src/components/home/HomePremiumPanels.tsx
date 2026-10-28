import Link from "next/link";
import { ArrowRight, CalendarDays, Headphones, Search, ShieldCheck, WalletCards } from "lucide-react";
import { Container } from "@/components/ui/Container";

const steps = [
  { icon: Search, title: "Hizmetini ve ustanı seç", description: "Kapsamı, fiyatı ve profilleri karşılaştır." },
  { icon: CalendarDays, title: "Randevunu planla", description: "Uygun saati seç, adresini ekle." },
  { icon: WalletCards, title: "Öde, siparişini takip et", description: "Toplamı gör, ödeme kuruluşunda öde." },
];
const reasons = [
  { icon: ShieldCheck, title: "Ustanı tanı", description: "Profil ve gerçek yorumlarla karar ver." },
  { icon: WalletCards, title: "Fiyatı bil", description: "Kapsamı ve toplamı ödemeden önce gör." },
  { icon: Headphones, title: "Desteğe ulaş", description: "Bir sorun varsa siparişinden destek iste." },
];

export function HomePremiumPanels() {
  return <>
    <section aria-labelledby="how-title" className="home-section home-how" id="how-it-works">
      <Container className="home-container">
        <div className="home-section-heading"><div><p className="home-eyebrow">NASIL ÇALIŞIR?</p><h2 className="home-section-title" id="how-title">Seç. Planla. Satın al.</h2></div></div>
        <ol className="home-steps">{steps.map(({ icon: Icon, title, description }, index) => <li key={title}><div className="home-step-top"><span className="home-step-icon"><Icon aria-hidden size={24} /></span><span className="home-step-number">0{index + 1}</span></div><h3>{title}</h3><p>{description}</p></li>)}</ol>
        <p className="home-payment-note">Şu anda yalnızca iyzico test ödemesi yapılır. Gerçek tahsilat yoktur.</p>
      </Container>
    </section>
    <section aria-labelledby="trust-title" className="home-section home-trust-compact" id="trust">
      <Container className="home-container"><div className="home-section-heading"><h2 className="home-section-title" id="trust-title">İçin rahat olsun.</h2></div><div className="home-trust-messages">{reasons.map(({ icon: Icon, title, description }) => <div className="home-reason" key={title}><span><Icon aria-hidden size={22} /></span><div><h3>{title}</h3><p>{description}</p></div></div>)}</div></Container>
    </section>
  </>;
}

export function HomeProviderInvite() {
  return <section className="home-section home-invite-section" id="about"><Container className="home-container"><div className="home-provider-invite"><div><p className="home-eyebrow">FUWU PARTNER</p><h2>Ustalığın işe dönüşsün.</h2><p>Hizmetlerini sun, takvimini ve kazancını yönet.</p></div><Link className="home-primary-link" href="/provider-application">Usta Ol <ArrowRight aria-hidden size={18} /></Link></div><details className="home-compact-faq" id="faq"><summary>Satın alma ve destek hakkında</summary><div><h3>Randevum ne zaman kesinleşir?</h3><p>Ödeme kuruluşundan başarılı sonuç doğrulandığında.</p><h3>İptal veya iade nasıl yapılır?</h3><p>Randevu başlamadan ve usta yola çıkmadan sipariş detayından iptal edebilirsin. İade, ödeme kuruluşundan doğrulanana kadar beklemede görünür.</p><h3>Destek nasıl alırım?</h3><p>Sipariş detayından destek isteyebilir veya <Link href="/#contact">bize ulaşabilirsin.</Link></p></div></details></Container></section>;
}
