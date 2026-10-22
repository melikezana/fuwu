import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, ChevronDown, ClipboardCheck, ListChecks, Search, SlidersHorizontal, UserRoundSearch } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { appRoutes } from "@/lib/constants/navigation";
import { servicePhotos } from "@/lib/service-photos";

const steps = [
  { icon: Search, title: "Hizmetinizi seçin", description: "İhtiyacınızı arayın veya hizmet kategorilerinden birini seçin.", href: appRoutes.services, action: "Hizmetleri keşfedin" },
  { icon: UserRoundSearch, title: "Size uygun ustayı bulun", description: "Bölgenizdeki profilleri, sunulan hizmetleri ve mevcut fiyat bilgilerini karşılaştırın.", href: appRoutes.providers, action: "Ustaları inceleyin" },
  { icon: CalendarDays, title: "Randevunuzu planlayın", description: "Müsait gün ve saati seçin, adresinizi ekleyin. Ödeme onayından sonra siparişinizi takip edin.", href: appRoutes.catalog, action: "Hizmetleri İncele" },
];
const reasons = [
  { icon: ListChecks, title: "İhtiyacınız olan hizmetler bir arada", description: "Farklı işler için ayrı ayrı aramak yerine evinizin ihtiyaçlarını aynı yerden planlayın." },
  { icon: SlidersHorizontal, title: "Karar vermeden önce karşılaştırın", description: "Ustanın uzmanlığını, hizmet bölgesini ve varsa yorum, fiyat ve doğrulama bilgilerini inceleyin." },
  { icon: ClipboardCheck, title: "Sürecin her adımını takip edin", description: "Siparişlerinize, randevu bilgilerine ve durum güncellemelerine hesabınızdan ulaşın." },
];
const questions = [
  { title: "Nasıl hizmet satın alabilirim?", answer: "Hizmetleri İncele ile katalogdan hizmetinizi seçin. Bölgenize hizmet veren ve fiyatı belli ustalardan birini seçip gerçek müsait gün ve saatleri görüntüleyin. Adres ve sipariş özetini kontrol ederek test ödemesine geçebilirsiniz." },
  { title: "Hangi bölgelerde hizmet bulabilirim?", answer: "FUWU’da İstanbul için hizmet arayabilirsiniz. Arama alanından ilçenizi seçerek o bölgede listelenen ustaları inceleyin. Uygunluk ve hizmet kapsamı, seçtiğiniz usta ve hizmete göre değişebilir." },
  { title: "Usta seçerken hangi bilgilere bakmalıyım?", answer: "Profildeki uzmanlık alanını, hizmet bölgesini, iş açıklamalarını, varsa iş fotoğraflarını, değerlendirmeleri ve doğrulama bilgilerini birlikte inceleyin. Yalnızca ilgili profilde mevcut olan bilgileri esas alın." },
  { title: "Siparişimi nereden takip edebilirim?", answer: "Hesabınıza giriş yaparak Siparişlerim bölümünden satın aldığınız hizmetin durumunu ve randevu bilgilerini görüntüleyebilirsiniz." },
];

export function HomePremiumPanels() {
  return (
    <>
      <section aria-labelledby="how-title" className="home-section home-how" id="how-it-works">
        <Container className="home-container">
          <div className="home-section-heading">
            <div><p className="home-eyebrow">NASIL ÇALIŞIR?</p><h2 className="home-section-title" id="how-title">İhtiyaçtan çözüme, üç adım.</h2><p className="home-section-description">Evinizdeki işler gözünüzde büyümesin.</p></div>
            <Link className="home-text-link" href={appRoutes.catalog}>Hemen başlayın <ArrowRight aria-hidden="true" className="size-4 shrink-0" /></Link>
          </div>
          <ol className="home-steps">
            {steps.map(({ icon: Icon, title, description, href, action }, index) => (
              <li key={title}><div className="home-step-top"><span className="home-step-icon"><Icon aria-hidden="true" className="size-6" /></span><span className="home-step-number">0{index + 1}</span></div><h3>{title}</h3><p>{description}</p><Link className="home-text-link" href={href}>{action}<ArrowRight aria-hidden="true" className="size-4 shrink-0" /></Link></li>
            ))}
          </ol>
        </Container>
      </section>

      <section aria-labelledby="trust-title" className="home-section" id="trust">
        <Container className="home-container">
          <div className="home-trust-grid">
            <div className="home-trust-photo">
              <Image alt={servicePhotos["furniture-assembly"].alt} className="object-cover" fill sizes="(max-width: 767px) 92vw, 540px" src={servicePhotos["furniture-assembly"].src} />
              <div className="home-trust-photo-caption"><span>Her iş, özen ister.</span><p>Eviniz için doğru desteği bulun.</p></div>
            </div>
            <div className="home-trust-content">
              <p className="home-eyebrow">NEDEN FUWU?</p>
              <h2 className="home-section-title" id="trust-title">Eviniz için iyi bir karar.<br />Her adımda kontrol sizde.</h2>
              <div className="home-reasons">{reasons.map(({ icon: Icon, title, description }) => <div className="home-reason" key={title}><span><Icon aria-hidden="true" className="size-5" /></span><div><h3>{title}</h3><p>{description}</p></div></div>)}</div>
              <Link className="home-primary-link" href={appRoutes.providers}>Size uygun hizmeti bulun <ArrowRight aria-hidden="true" className="size-4 shrink-0" /></Link>
            </div>
          </div>
        </Container>
      </section>

      <section aria-labelledby="faq-title" className="home-section home-faq" id="faq">
        <Container className="home-container home-faq-grid">
          <div><p className="home-eyebrow">AKLINIZDA SORU KALMASIN</p><h2 className="home-section-title" id="faq-title">Size nasıl yardımcı olabiliriz?</h2><p className="home-section-description">Hizmet aramaya başlamadan önce bilmek isteyebilecekleriniz.</p><Link className="home-text-link" href="/#contact">Bize ulaşın <ArrowRight aria-hidden="true" className="size-4 shrink-0" /></Link></div>
          <div className="home-faq-items">{questions.map(({ title, answer }) => <details key={title}><summary><span>{title}</span><ChevronDown aria-hidden="true" className="size-5 shrink-0" /></summary><p>{answer}</p></details>)}</div>
        </Container>
      </section>

      <section className="home-section home-final" id="about">
        <Container className="home-container">
          <div className="home-final-card"><div><p className="home-eyebrow">BEKLEYEN İŞLERİ BİRLİKTE ÇÖZELİM</p><h2>Evinizin ihtiyacı varsa,<br />FUWU burada.</h2><p>İlk adım, ihtiyacınız olan hizmeti seçmek.</p></div><Link className="home-primary-link" href={appRoutes.catalog}>Hizmetleri İncele <ArrowRight aria-hidden="true" className="size-4 shrink-0" /></Link></div>
          <div className="home-provider-invite"><div><strong>İşinizin ustası mısınız?</strong><p>Hizmetlerinizi FUWU’da sunmak için başvurun.</p></div><Link className="home-text-link" href={appRoutes.providerApplication}>Hizmet veren olun <ArrowRight aria-hidden="true" className="size-4 shrink-0" /></Link></div>
        </Container>
      </section>
    </>
  );
}
