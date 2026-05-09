import { Container } from "@/components/common/Container";

type TrustCard = {
  id: string;
  title: string;
  description: string;
  mark: string;
};

const trustCards: TrustCard[] = [
  {
    id: "direct-contact",
    title: "Puanı kontrol et",
    description: "Yorum sayısı ve tamamlanan iş bilgisiyle profili değerlendir.",
    mark: "01",
  },
  {
    id: "average-price",
    title: "Fiyat aralığını gör",
    description: "Karar vermeden önce beklenen bütçe seviyesini incele.",
    mark: "02",
  },
  {
    id: "real-ratings",
    title: "İletişime geç",
    description: "Telefon veya WhatsApp ile uygun ustaya doğrudan ulaş.",
    mark: "03",
  },
  {
    id: "fast-response",
    title: "Doğru kararı ver",
    description: "Tüm detaylar netleştiğinde bir sonraki adıma geç.",
    mark: "04",
  },
];

export function TrustSection() {
  return (
    <section className="border-b border-[var(--border)] bg-white" id="trust">
      <Container className="py-8 sm:py-10">
        <div className="grid gap-4 lg:grid-cols-[0.86fr_1.14fr] lg:items-center lg:gap-8">
          <div className="min-w-0">
            <p className="text-sm font-bold uppercase tracking-normal text-[var(--brand-orange-dark)]">
              Fuwu ile süreç
            </p>
            <h2 className="mt-2 text-2xl font-bold leading-tight text-[var(--brand-navy)] sm:text-3xl">
              Tüm detayları tek bakışta gör.
            </h2>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {trustCards.map((card) => (
              <div
                className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4"
                key={card.id}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-orange-soft)] text-xs font-black text-[var(--brand-orange-dark)] ring-1 ring-[rgba(255,138,0,0.22)]">
                  {card.mark}
                </span>
                <span className="min-w-0">
                  <span className="block font-bold leading-tight text-[var(--brand-navy)]">
                    {card.title}
                  </span>
                  <span className="mt-2 block text-sm leading-6 text-[var(--muted)]">
                    {card.description}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
