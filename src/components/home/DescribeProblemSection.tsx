import { Camera, ListChecks, MessagesSquare, ShieldCheck } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { OpenAssistantButton } from "@/components/home/OpenAssistantButton";

const steps = [
  { icon: Camera, title: "Fotoğraf, yazı ya da sesle anlat", description: "“Lavabonun altından su sızıyor.” Kategori seçmene gerek yok." },
  { icon: MessagesSquare, title: "FUWU ihtiyacını netleştirsin", description: "Gerekli soruları sorar, uygun hizmeti ve kapsamını önerir. Kesin teşhisi usta yerinde koyar." },
  { icon: ListChecks, title: "Uygun hizmet ve ustaları gör", description: "Fiyatı, dahil olan işleri ve usta profillerini yan yana karşılaştır." },
  { icon: ShieldCheck, title: "Seç, güvenli süreç başlasın", description: "Randevu, kapıda doğrulama kodu, iş tamamlama ve senin onayın." },
];

/** “Sorununu anlat. Çözümü FUWU bulsun.” — ana sayfadan akıllı asistana giden yol. */
export function DescribeProblemSection() {
  return (
    <section aria-labelledby="describe-title" className="home-section home-describe">
      <Container className="home-container">
        <div className="home-section-heading">
          <div>
            <p className="home-eyebrow">YAPAY ZEKÂ DESTEKLİ</p>
            <h2 className="home-section-title" id="describe-title">Sorununu anlat. Çözümü FUWU bulsun.</h2>
            <p className="home-section-description">Hangi ustayı çağıracağını bilmek zorunda değilsin. Ne gördüğünü anlat, gerisini birlikte netleştirelim.</p>
          </div>
        </div>
        <ol className="home-steps home-steps--four">
          {steps.map(({ icon: Icon, title, description }, index) => (
            <li key={title}>
              <div className="home-step-top"><span className="home-step-icon"><Icon aria-hidden size={24} /></span><span className="home-step-number">0{index + 1}</span></div>
              <h3>{title}</h3>
              <p>{description}</p>
            </li>
          ))}
        </ol>
        <div className="home-describe-action">
          <OpenAssistantButton />
          <p>Usta ağımızı kuruyoruz. Değerlendirme ve hizmet önerisi şimdiden çalışır; online satın alma henüz açılmadı.</p>
        </div>
      </Container>
    </section>
  );
}
