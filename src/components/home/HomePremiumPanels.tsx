import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarDays, Search } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { PRELAUNCH_COPY } from "@/lib/prelaunch";

const steps = [
  { icon: Search, title: "Hizmeti seç", description: "Kapsamı ve dahil olmayanları baştan gör." },
  { icon: BadgeCheck, title: "Ustayı tanı", description: "Profilini ve tamamlanan doğrulama adımlarını incele." },
  { icon: CalendarDays, title: "Zamanını planla", description: "Satış açıldığında ustanın boş saatlerinden sana uyanı seçersin." },
];
export function HomePremiumPanels() {
  return <section aria-labelledby="how-title" className="home-section home-how" id="how-it-works"><Container className="home-container"><div className="home-section-heading"><div><p className="home-eyebrow">NASIL ÇALIŞIR?</p><h2 className="home-section-title" id="how-title">{PRELAUNCH_COPY.howTitle}</h2></div></div><ol className="home-steps">{steps.map(({icon:Icon,title,description},index)=><li key={title}><div className="home-step-top"><span className="home-step-icon"><Icon aria-hidden size={24}/></span><span className="home-step-number">0{index+1}</span></div><h3>{title}</h3><p>{description}</p></li>)}</ol></Container></section>;
}
export function HomeProviderInvite() {
  return <section className="home-section" id="trust"><Container className="home-container"><details className="home-compact-faq" id="faq"><summary>Satın alma ve destek</summary><div><h3>Ne zaman satın alabilirim?</h3><p>Online satın alma henüz açılmadı. <Link href="/waitlist">Açılıştan haberdar ol.</Link></p><h3>Evime kim gelecek?</h3><p>Satış açıldığında hizmeti sunan ustanın profilini ve müsaitliğini satın almadan önce görebileceksin.</p><h3>İş tamamlanmazsa ne olur?</h3><p>İptal, iade ve sorun bildirme adımları siparişinde yer alır. İade sonucu ödeme kuruluşundan doğrulanarak gösterilir.</p><h3>Nasıl destek alırım?</h3><p><Link href="/iletisim">İletişim bilgilerimizden</Link> bize ulaşabilirsin.</p><Link className="home-text-link" href="/provider-application">Usta Ol <ArrowRight size={16} aria-hidden/></Link></div></details></Container></section>;
}
