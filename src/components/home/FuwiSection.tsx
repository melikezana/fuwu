import { Container } from "@/components/ui/Container";
import { FuwiMascot } from "@/components/ai/FuwiMascot";
import { OpenAssistantButton } from "@/components/home/OpenAssistantButton";

const steps = [
  { title: "Gördüğünü anlat", text: "Yaz, sesle söyle ya da fotoğraf ekle. Kategori seçmen gerekmez." },
  { title: "Fuwi netleştirsin", text: "Önce güvenliğini düşünür, sonra uygun hizmeti ve kapsamını gösterir." },
  { title: "Ustanı seç", text: "Profili, kapsamı ve uygun saatleri karşılaştır. Kesin teşhisi usta yerinde koyar." },
];

/** Ana sayfada tek "nasıl çalışır" bandı: Fuwi'ye anlat → netleştir → ustanı seç. */
export function FuwiSection() {
  return (
    <section aria-labelledby="fuwi-title" className="home-section home-fuwi" id="how-it-works">
      <Container className="home-container">
        <div className="home-fuwi-card">
          <div className="home-fuwi-intro">
            <FuwiMascot decorative />
            <div>
              <p className="home-fuwi-name">Fuwi · yapay zekâ ev asistanı</p>
              <h2 className="home-section-title" id="fuwi-title">Hangi ustayı çağıracağını bilmiyor musun?</h2>
              <p className="home-section-description">Fuwi&apos;ye anlat; doğru hizmeti birlikte bulalım.</p>
            </div>
          </div>
          <ol className="home-fuwi-steps">
            {steps.map(step => <li key={step.title}><strong>{step.title}</strong><span>{step.text}</span></li>)}
          </ol>
          <div className="home-fuwi-action">
            <OpenAssistantButton label="Fuwi'ye anlat" />
            <p>Fuwi bir yapay zekâ asistanıdır. Acil durumda 112&apos;yi, gaz kokusunda 187&apos;yi ara.</p>
          </div>
        </div>
      </Container>
    </section>
  );
}
