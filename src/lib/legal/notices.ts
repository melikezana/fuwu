// Aydınlatma ve onay metinleri tek kaynaktan gelir: formda açılan metin, /kvkk sayfası ve veritabanına
// yazılan sürüm aynıdır. Metin değişirse sürüm de değişmeli; sürüm kontrolü veritabanı fonksiyonunda tekrarlanır.
//
// KVKK Kurulu 2026/347 sayılı İlke Kararı (RG 24.03.2026): aydınlatma metni ile açık rıza/onay ayrı metin ve ayrı
// beyan olarak sunulur; aydınlatma için yalnızca "okudum, bilgi edindim" beyanı alınır, onay istenmez.
// 6563 sayılı Kanun ve Ticari İletişim ve Ticari Elektronik İletiler Hakkında Yönetmelik: ticari e-posta için
// önceden onay; onay alındığı bilgisi 24 saat içinde alıcıya iletilir; İYS dışında alınan onay 3 iş günü içinde İYS'ye
// kaydedilir. Bu yüzden e-posta onayı ancak admin "launch_marketing_email_enabled" ayarını açınca sorulur.

export const DATA_CONTROLLER = {
  name: "Melike Dağkesen (FUWU)",
  note: "FUWU henüz şirketleşmediği için veri sorumlusu kurucu gerçek kişidir; şirket kurulduğunda bu bilgi güncellenecektir.",
  email: "fuwuhizmet@gmail.com",
} as const;

export const LAUNCH_NOTICE_VERSION = "aydinlatma-acilis-2026-11-13";
export const LAUNCH_MARKETING_VERSION = "eti-eposta-2026-11-13";
export const PROVIDER_APPLICATION_NOTICE_VERSION = "aydinlatma-usta-2026-11-13";

export type NoticeSection = { title: string; body: string[] };
export type LegalNotice = { id: string; title: string; version: string; updated: string; sections: NoticeSection[] };

const controllerSection: NoticeSection = {
  title: "Veri sorumlusu",
  body: [`${DATA_CONTROLLER.name}. ${DATA_CONTROLLER.note} İletişim: ${DATA_CONTROLLER.email}`],
};

const rightsSection: NoticeSection = {
  title: "Hakların",
  body: [
    "KVKK'nın 11. maddesi uyarınca verilerinin işlenip işlenmediğini öğrenme, bilgi isteme, amaca uygun kullanılıp kullanılmadığını öğrenme, aktarıldığı kişileri bilme, eksik ya da yanlışsa düzeltilmesini, şartları oluştuğunda silinmesini isteme, itiraz etme ve zarara uğradıysan giderilmesini talep etme hakların var.",
    `Taleplerini ${DATA_CONTROLLER.email} adresine, hesabındaki e-posta adresinden yazabilirsin; en geç 30 gün içinde yanıtlanır. Yanıtı yeterli bulmazsan Kişisel Verileri Koruma Kurulu'na şikâyette bulunabilirsin.`,
  ],
};

const processorsSection: NoticeSection = {
  title: "Kimlere aktarılır",
  body: [
    "Veriler yalnızca hizmetin çalışması için gereken teknik altyapı sağlayıcılarıyla paylaşılır: veritabanı ve giriş altyapısı (Supabase), barındırma (Vercel) ve hata izleme (Sentry; kişisel veri en aza indirilmiş olarak). Bu sağlayıcıların sunucuları yurt dışında bulunabilir; aktarım KVKK'nın 9. maddesindeki güvencelere göre yapılır.",
    "Veriler satılmaz, reklam amacıyla üçüncü kişilerle paylaşılmaz. Kanuni zorunluluk hâlinde yetkili kurumlara bilgi verilebilir.",
  ],
};

export const LAUNCH_INTEREST_NOTICE: LegalNotice = {
  id: "launch-interest",
  title: "Açılış talebi aydınlatma metni",
  version: LAUNCH_NOTICE_VERSION,
  updated: "13 Kasım 2026",
  sections: [
    controllerSection,
    {
      title: "Hangi verileri işliyoruz",
      body: [
        "Giriş yaptığın hesabın kimliği ve doğrulanmış e-posta adresin, seçersen ilçe ve hizmet tercihin, kaydın ve beyanlarının tarihi ile metin sürümü. Kötüye kullanımı önlemek için deneme sayısı da tutulur.",
      ],
    },
    {
      title: "Amaç ve hukuki sebep",
      body: [
        "Talebini kaydetmek, hangi ilçede hangi hizmete ihtiyaç olduğunu toplu olarak görüp ilk ustaları oraya davet etmek ve talebini bu sayfadan yönetebilmeni sağlamak. Hukuki sebep: KVKK m.5/2(f), meşru menfaat. Talep sayıları ekipte yalnızca toplu (ilçe × hizmet) olarak görülür.",
        "Açılış ve hizmetler hakkında e-posta göndermek ise ayrı bir amaçtır ve yalnızca aşağıda ayrıca vereceğin ticari elektronik ileti onayına dayanır (KVKK m.5/1, 6563 sayılı Kanun m.6). Onay vermesen de talebin kaydedilir.",
      ],
    },
    {
      title: "Nasıl toplanır",
      body: ["Bu form aracılığıyla, elektronik ortamda ve otomatik yollarla."],
    },
    processorsSection,
    {
      title: "Ne kadar saklanır",
      body: [
        "Talebin, sen kaldırana kadar ya da en geç FUWU'nun bölgende açılmasından 12 ay sonrasına kadar saklanır. Kaldırdığında talep sayılarından hemen düşer.",
        "Beyan ve onay geçmişin (ne zaman verildiği, ne zaman geri çekildiği), ispat yükümlülüğü nedeniyle mevzuatın öngördüğü süre boyunca erişimi kısıtlı olarak saklanır.",
      ],
    },
    rightsSection,
  ],
};

export const LAUNCH_MARKETING_CONSENT = {
  title: "Ticari elektronik ileti onayı",
  version: LAUNCH_MARKETING_VERSION,
  body: [
    `${DATA_CONTROLLER.name}, FUWU'nun açılışı, bölgende açılan hizmetler ve kampanyalar hakkında, hesabındaki e-posta adresine ticari elektronik ileti gönderebilir. Bu amaçla e-posta adresin ve tercihlerin işlenir.`,
    "Onay isteğe bağlıdır; vermesen de talebin kaydedilir ve FUWU'yu kullanabilirsin. Onayın alındığına dair bilgi 24 saat içinde e-posta adresine gönderilir. Onayını istediğin an bu sayfadan, her e-postadaki ret bağlantısından ya da İleti Yönetim Sistemi (İYS) üzerinden geri çekebilirsin.",
  ],
  statement: "FUWU'nun açılışı ve hizmetleri hakkında e-posta ile ticari elektronik ileti gönderilmesine onay veriyorum.",
} as const;

export const PROVIDER_APPLICATION_NOTICE: LegalNotice = {
  id: "provider-application",
  title: "Usta başvurusu aydınlatma metni",
  version: PROVIDER_APPLICATION_NOTICE_VERSION,
  updated: "13 Kasım 2026",
  sections: [
    controllerSection,
    {
      title: "Hangi verileri işliyoruz",
      body: [
        "Ad soyad, doğrulanmış cep telefonu, giriş yaptığın hesabın kimliği, hizmet kategorin ve çalışma ilçen, başvurunun tarihi ve durumu, bu metnin sürümü.",
        "Başvurun onaylanırsa yayından önce Usta Paneli'nde kimlik, adli sicil, banka hesabı ve mesleki belgeler istenir. Bu belgeler için orada ayrı bir aydınlatma yapılır; bu formda belge alınmaz.",
      ],
    },
    {
      title: "Amaç ve hukuki sebep",
      body: [
        "Başvurunu değerlendirmek, telefonunu doğrulamak, başvurunun durumunu sana SMS ve hesabın üzerinden bildirmek ve onaylanırsa usta profilini oluşturmak. Hukuki sebep: KVKK m.5/2(c), bir sözleşmenin kurulmasıyla doğrudan ilgili olması.",
        "Sahte ya da tekrarlı başvuruları önlemek ve güvenliği sağlamak. Hukuki sebep: KVKK m.5/2(f), meşru menfaat.",
      ],
    },
    {
      title: "Nasıl toplanır",
      body: ["Bu form ve SMS doğrulaması aracılığıyla, elektronik ortamda ve otomatik yollarla."],
    },
    {
      ...processorsSection,
      body: [
        ...processorsSection.body,
        "Telefon doğrulama kodu ve başvuru durum mesajları SMS hizmet sağlayıcısı üzerinden gönderilir.",
      ],
    },
    {
      title: "Ne kadar saklanır",
      body: [
        "Başvurun reddedilir ya da geri çekilirse 1 yıl, onaylanıp usta olursan FUWU'da çalıştığın süre boyunca ve sonrasında yasal saklama süreleri kadar saklanır.",
      ],
    },
    rightsSection,
  ],
};
