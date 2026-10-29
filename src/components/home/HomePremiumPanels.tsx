import Link from "next/link";
import { ArrowRight, CalendarDays, Search, WalletCards } from "lucide-react";
import { Container } from "@/components/ui/Container";

const steps = [
  { icon: Search, title: "Hizmetini ve ustanı seç", description: "Kapsamı, fiyatı ve profilleri incele." },
  { icon: CalendarDays, title: "Zamanını planla", description: "Uygun saati seç, adresini ekle." },
  { icon: WalletCards, title: "Toplamı gör, satın al", description: "Ödeme sonrası siparişini takip et." },
];
export function HomePremiumPanels() {
  return <section aria-labelledby="how-title" className="home-section home-how" id="how-it-works"><Container className="home-container"><div className="home-section-heading"><div><p className="home-eyebrow">NASIL ÇALIŞIR?</p><h2 className="home-section-title" id="how-title">Seç. Planla. Satın al.</h2></div></div><ol className="home-steps">{steps.map(({icon:Icon,title,description},index)=><li key={title}><div className="home-step-top"><span className="home-step-icon"><Icon aria-hidden size={24}/></span><span className="home-step-number">0{index+1}</span></div><h3>{title}</h3><p>{description}</p></li>)}</ol></Container></section>;
}
export function HomeProviderInvite() {
  return <section className="home-section" id="trust"><Container className="home-container"><details className="home-compact-faq" id="faq"><summary>Satın alma ve destek</summary><div><h3>Ne zaman satın alabilirim?</h3><p>Online satın alma henüz açılmadı. <Link href="/waitlist">Açılıştan haberdar ol.</Link></p><h3>Evime kim gelecek?</h3><p>Satış açıldığında hizmeti sunan ustanın profilini ve müsaitliğini satın almadan önce görebileceksin.</p><h3>İş tamamlanmazsa ne olur?</h3><p>İptal, iade ve sorun bildirme adımları siparişinde yer alır. İade sonucu ödeme kuruluşundan doğrulanarak gösterilir.</p><h3>Nasıl destek alırım?</h3><p><Link href="/#contact">İletişim bilgilerimizden</Link> bize ulaşabilirsin.</p><Link className="home-text-link" href="/provider-application">Usta Ol <ArrowRight size={16} aria-hidden/></Link></div></details></Container></section>;
}
