export type Feature = {
  id: string;
  title: string;
  description: string;
};

export const features: Feature[] = [
  {
    id: "reviewed-provider-path",
    title: "Değerlendirilen usta profilleri",
    description:
      "Usta başvurularında hizmet bölgesi, deneyim, ekipman ve çalışma standardı bilgileri birlikte değerlendirilir.",
  },
  {
    id: "details-upfront",
    title: "Net ihtiyaç özeti",
    description:
      "Her talep; hizmet, konum, zamanlama, erişim bilgisi ve kısa notla karar vermeye hazır hale gelir.",
  },
  {
    id: "low-risk-start",
    title: "Ödeme olmadan başla",
    description:
      "Hesap oluşturmadan ve ödeme bilgisi girmeden talep oluşturabilirsin.",
  },
];
