import type { Metadata } from "next";
import { PolicyPage, type PolicySection } from "@/app/_policy/PolicyPage";

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni",
  description:
    "Fuwu kullanıcıları ve usta başvuru sahipleri için KVKK kapsamında bilgilendirme metni.",
};

const sections: PolicySection[] = [
  {
    id: "launch-interest",
    title: "Açılış bilgilendirmesi",
    body: [
      "Açılış bilgilendirmesine katılmayı seçersen doğrulanmış hesabındaki e-posta adresi, isteğe bağlı ilçe ve kategori tercihin ile izin tarihi ve metin sürümü kaydedilir. Bu bilgiler açılış haberini iletmek ve bölge/hizmet ilgisini toplu değerlendirmek amacıyla işlenir. Katılım isteğe bağlıdır; hizmetleri incelemek için izin vermen gerekmez.",
      "İletişim iznini /waitlist sayfasında aynı hesapla giriş yaparak geri çekebilirsin. Geri çekilen kayıtlar bilgilendirme listesine ve aktif ilgi sayısına dahil edilmez. İzin geçmişi kötüye kullanımı önleme ve izni belgeleme amacıyla sınırlı erişimle tutulur. Pazarlama iletisi gönderimi için ayrıca gerekli operasyonel ve hukuki hazırlıkların tamamlanması gerekir.",
      "Verilere yalnızca yetkili ekip ve teknik altyapı hizmet sağlayıcıları görevleri kapsamında erişebilir. Erişim, düzeltme ve silme taleplerini fuwuhizmet@gmail.com adresine iletebilirsin. Açılış bilgilendirme kaydı, veri sorumlusu ve saklama koşulları tamamlandıktan sonra açılır.",
    ],
  },
  {
    title: "Veri sorumlusu ve kapsam",
    body: [
      "Bu metin, Fuwu hizmet pazaryeri deneyimini kullanan müşteriler, ziyaretçiler ve usta başvuru sahipleri için kişisel verilerin hangi amaçlarla işlendiğini açıklar.",
      "Fuwu; kullanıcıların hizmet arama, usta profillerini inceleme, randevu planlama ve hizmet satın alma ve usta başvurusu yapma süreçlerinde paylaştığı verileri yalnızca meşru ve sınırlı amaçlarla işlemeyi hedefler.",
    ],
  },
  {
    title: "İşlenen kişisel veriler",
    body: [
      "Ad soyad, telefon numarası, e-posta adresi, hizmet kategorisi, hizmet bölgesi, başvuru açıklamaları, talep detayları ve iletişim tercihleri işlenebilir.",
      "Usta başvurularında deneyim, ekipman bilgisi, çalışma uygunluğu, referans bağlantısı ve isteğe bağlı profil görseli gibi mesleki bilgiler de değerlendirilebilir.",
    ],
  },
  {
    title: "İşleme amaçları",
    body: [
      "Veriler; hizmet talebini anlamak, kullanıcıyı uygun profillerle buluşturmak, usta başvurularını değerlendirmek, güvenli iletişim akışı sağlamak ve kötüye kullanımı önlemek amacıyla işlenir.",
      "İletişim bilgileri, kullanıcının talebine yanıt vermek veya başvuru süreci hakkında bilgilendirme yapmak için kullanılabilir.",
    ],
  },
  {
    title: "Haklarınız",
    body: [
      "KVKK kapsamındaki haklarınızla ilgili bilgi almak, verilerinize erişim talep etmek veya düzeltme/silme taleplerinizi iletmek için fuwuhizmet@gmail.com adresinden Fuwu ekibine ulaşabilirsiniz.",
      "Talepler, kimlik doğrulama ve yasal saklama yükümlülükleri dikkate alınarak değerlendirilir.",
    ],
  },
];

export default function KvkkPage() {
  return (
    <PolicyPage
      description="Kişisel verilerin işlenmesine dair temel bilgilendirme."
      descriptionKey="policy.kvkk.description"
      sections={sections}
      title="KVKK Aydınlatma Metni"
      titleKey="policy.kvkk.title"
      updatedAt="30 Ekim 2026"
    />
  );
}
