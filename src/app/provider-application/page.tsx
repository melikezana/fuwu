import type { Metadata } from "next";
import { FuwuLogo, FuwuWatermark } from "@/components/brand/FuwuLogo";
import { Card } from "@/components/common/Card";
import { Container } from "@/components/common/Container";
import { ProviderApplicationForm } from "@/components/provider/ProviderApplicationForm";

export const metadata: Metadata = {
  title: "Usta Ağına Katıl | Fuwu",
  description: "Fuwu’da görünür olmak, doğru müşterilerden telefon ve WhatsApp ile talep almak için usta başvurusu yap.",
};

const applicationHighlights = [
  {
    label: "01",
    title: "Profil",
    description: "İletişim, kategori, hizmet bölgesi ve deneyimini tek profilde topla.",
  },
  {
    label: "02",
    title: "Hazırlık",
    description: "Uygunluk, ekipman ve çalışma düzenini netleştir.",
  },
  {
    label: "03",
    title: "Görünürlük",
    description: "Canlı sistem açıldığında uygun profiller müşterilerin karşısına çıkar.",
  },
];

export default function ProviderApplicationPage() {
  return (
    <section className="relative overflow-hidden border-b border-[var(--border)] bg-[linear-gradient(135deg,#ffffff_0%,#FFF7EC_44%,#F7F7F8_100%)]">
      <FuwuWatermark className="-left-20 top-10 text-[10rem] opacity-[0.04] sm:text-[13rem]" />
      <Container className="relative grid max-w-7xl gap-8 py-10 sm:py-14 lg:py-16 xl:grid-cols-[minmax(0,720px)_minmax(0,1fr)] xl:items-start">
        <div className="min-w-0 cursor-default select-none lg:max-w-[720px]">
          <div className="inline-flex rounded-lg bg-[var(--brand-navy)] px-5 py-4 shadow-[0_24px_70px_rgba(13,20,36,0.18)]">
            <FuwuLogo inverted size="lg" />
          </div>
          <p className="mt-7 text-sm font-black uppercase tracking-normal text-[var(--brand-orange-dark)]">
            Usta ağına katıl
          </p>
          <h1 className="mt-4 max-w-[720px] text-3xl font-black leading-[1.1] tracking-normal text-[var(--brand-navy)] sm:text-4xl lg:text-[2.65rem] xl:text-5xl">
            Profilini oluştur, Fuwu’da görünür ol.
          </h1>
          <p className="mt-5 max-w-[680px] text-base font-medium leading-7 text-[var(--muted)] sm:text-lg sm:leading-8">
            Müşteriler sana doğrudan telefon veya WhatsApp üzerinden ulaşsın.
          </p>
          <div className="mt-6 cursor-default select-none rounded-lg border border-[rgba(255,138,0,0.28)] bg-white p-5 shadow-[0_22px_64px_rgba(13,20,36,0.09)]">
            <p className="text-sm font-black uppercase text-[var(--brand-orange-dark)]">
              Profesyonel görünürlük
            </p>
            <p className="mt-2 text-base font-bold leading-7 text-[var(--brand-navy)]">
              Hizmet alanını, çalışma bölgeni ve iletişim bilgilerini netleştir; başvurun
              değerlendirme kuyruğuna güvenle alınır.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {applicationHighlights.map((item) => (
              <div
                className="grid min-w-0 cursor-default select-none grid-cols-[auto_minmax(0,1fr)] gap-4 border-t border-[var(--border)] pt-5"
                key={item.label}
              >
                <div className="flex size-11 items-center justify-center rounded-md bg-[var(--brand-navy)] text-sm font-black text-white">
                  {item.label}
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-black leading-tight text-[var(--brand-navy)]">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-sm font-medium leading-6 text-[var(--muted)]">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <Card className="mt-8 cursor-default select-none overflow-hidden !p-0 shadow-[0_22px_60px_rgba(13,20,36,0.08)]">
            <div className="bg-[var(--brand-navy)] px-5 py-4 text-white">
              <p className="text-xs font-bold uppercase tracking-normal text-[var(--brand-orange)]">
                Usta ağı
              </p>
              <p className="mt-2 text-lg font-bold leading-6">
                Başvurular incelendikten sonra uygun profiller yayına hazırlanır.
              </p>
            </div>
            <div className="p-5">
              <p className="text-xs font-bold uppercase tracking-normal text-[var(--muted)]">
                Fuwu ile süreç
              </p>
              <p className="mt-2 text-base font-bold leading-6 text-[var(--brand-navy)]">
                Başvuru için hesap kurulumu, şifre veya ödeme bilgisi gerekmez.
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Başvuru; hizmet kalitesi, bölge, uygunluk ve iletişim hazırlığına odaklanır.
              </p>
            </div>
          </Card>
        </div>

        <ProviderApplicationForm />
      </Container>
    </section>
  );
}
