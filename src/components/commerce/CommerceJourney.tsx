import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarCheck2, Check, ShoppingBag } from "lucide-react";
export function CommerceJourney() {
  return <section className="commerce-journey" aria-labelledby="commerce-journey-title">
    <div className="commerce-journey-heading"><div><p className="commerce-eyebrow">HİZMET ALMANIN YENİ YOLU</p><h2 id="commerce-journey-title">Seç. Planla. İşin hallolsun.</h2></div><span className="commerce-badge"><Check size={14} aria-hidden /> Doğrudan satın alma</span></div>
    <ol className="commerce-journey-steps">
      <li><div className="commerce-step-photo"><Image src="/images/services/plumbing-work.webp" alt="Tesisat bağlantısı üzerinde çalışan usta" fill sizes="(max-width: 640px) 44vw, 280px" /></div><span><b>01</b> Hizmetini seç</span></li>
      <li><div className="commerce-step-photo"><Image src="/images/services/furniture.webp" alt="Mobilya montajı yapan usta; hizmeti tanıtan fotoğraf" fill sizes="(max-width: 640px) 44vw, 280px" /></div><span><b>02</b> Ustanı seç</span></li>
      <li className="commerce-calendar-step"><div><CalendarCheck2 aria-hidden size={48} strokeWidth={1.5} /><p>Senin için uygun<br /><strong>gün ve saatte.</strong></p></div><span><b>03</b> Randevunu planla</span></li>
    </ol>
    <div className="commerce-journey-bottom"><p><ShoppingBag size={21} aria-hidden /><span><strong>Fiyatı gör, güvenle ilerle.</strong><small>Hizmet, usta ve randevu tek siparişte.</small></span></p><Link className="commerce-button" href="/services">Hizmetleri İncele <ArrowRight size={18} aria-hidden /></Link></div>
  </section>;
}
