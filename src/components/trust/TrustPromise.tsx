import Link from "next/link";
import { ArrowRight, BadgeCheck, KeyRound, MessageSquareQuote, ReceiptText, ShieldCheck, Undo2 } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { PRELAUNCH_COPY } from "@/lib/prelaunch";

// Metinler, ev hizmeti platformlarında en sık görülen şikâyetlere karşılık gelir:
// sonradan artan fiyat, gelmeyen usta, kimliği belirsiz kişi, sahte yorum, iade alamamak.
export const trustPromises = [
  { icon: ReceiptText, title: "Fiyat baştan belli", copy: "Gördüğün fiyat, ödediğin fiyattır. Ödeme ekranında sürpriz ücret çıkmaz." },
  { icon: BadgeCheck, title: "Usta kimliğiyle gelir", copy: "Kimliği, telefonu ve belgeleri incelenen ustalar satış yapabilir." },
  { icon: KeyRound, title: "İş, senin kodunla kapanır", copy: "Usta işi bitirince sana özel 6 haneli kodu ister. Kod sende, kontrol sende." },
  { icon: MessageSquareQuote, title: "Yorumlar gerçek", copy: "Yalnızca hizmeti satın alıp tamamlayan müşteri yorum yazabilir." },
  { icon: ShieldCheck, title: "Kart bilgin bizde durmaz", copy: "Ödemeni lisanslı ödeme kuruluşunun 3D Secure ekranında yaparsın." },
  { icon: Undo2, title: "İptal kolay, iade açık", copy: "Randevu başlamadan siparişinden iptal edersin; iadeni adım adım izlersin." },
] as const;

export function TrustPromise() {
  return (
    <section aria-labelledby="trust-promise-title" className="home-section trust-promise" id="guven">
      <Container className="home-container">
        <div className="home-section-heading">
          <div>
            <p className="home-eyebrow">İKİ TARAFLI GÜVEN</p>
            <h2 className="home-section-title" id="trust-promise-title">Kapını açmadan önce için rahat olsun.</h2>
            <p className="home-section-description">Müşteri de usta da doğrulanır. Herkes kime güvendiğini bilir.</p>
            <p className="home-section-description" role="note">{PRELAUNCH_COPY.trustStage}</p>
          </div>
          <Link className="home-text-link" href="/guven">Nasıl doğruluyoruz? <ArrowRight size={16} aria-hidden /></Link>
        </div>
        <ul aria-label="Güven taahhütleri" className="trust-promise-grid" tabIndex={0}>
          {trustPromises.map(({ icon: Icon, title, copy }) => (
            <li key={title}>
              <span className="trust-promise-icon"><Icon aria-hidden size={22} /></span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
