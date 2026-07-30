import type { ServiceIconName } from "@/lib/constants/services";

export const homePopularServiceIds = [
  "electrical",
  "plumbing",
  "cleaning",
  "painting",
  "climate-appliance-service",
  "locksmith",
  "furniture-assembly",
  "moving-help",
] as const;

export const homeCopy = {
  hero: {
    eyebrow: "Doğru hizmete giden güvenli yol",
    title: "Güven, doğru ustayla başlar.",
    description:
      "İhtiyacını seç, güvenilir ustaları karşılaştır, doğru hizmete zahmetsizce ulaş.",
    primaryCta: "Usta Bul",
    secondaryCta: "Hizmet Ver",
    searchServiceLabel: "Hangi hizmete ihtiyacın var?",
    searchServicePlaceholder: "Elektrik, temizlik, klima bakımı...",
    searchDistrictLabel: "İlçe veya konum",
    searchDistrictPlaceholder: "İstanbul ilçesi seç",
    trustSignals: [
      "Doğrulanmış profiller",
      "Gerçek kullanıcı değerlendirmeleri",
      "Şeffaf hizmet süreci",
    ],
  },
  howItWorks: {
    eyebrow: "Nasıl çalışır?",
    title: "Üç adımda daha net karar ver.",
    description:
      "Fuwu, aradığın hizmeti hızlıca daraltır; profilleri, bölgeyi ve güven sinyallerini aynı akışta gösterir.",
    steps: [
      {
        description:
          "Kategori ya da arama alanından ihtiyacını yaz, bulunduğun ilçeyi seç.",
        title: "İhtiyacını seç",
      },
      {
        description:
          "Puan, yorum sayısı, fiyat aralığı, uygunluk ve doğrulama bilgilerini birlikte incele.",
        title: "Ustaları karşılaştır",
      },
      {
        description:
          "Profil detayını aç, iletişim seçeneklerini gör ve hizmet talebini güvenle oluştur.",
        title: "Güvenle karar ver",
      },
    ],
  },
  providers: {
    eyebrow: "Öne çıkan ustalar",
    title: "Karar vermeyi kolaylaştıran profil kartları.",
    description:
      "Gerçek verisi olan profiller; uzmanlık, ilçe, puan, yorum ve doğrulama bilgileriyle listelenir.",
    emptyTitle: "Henüz yayında doğrulanmış usta bulunmuyor.",
    emptyDescription:
      "Canlı profiller onaylandığında burada görünür. Şimdilik hizmetini seçip talep oluşturabilirsin.",
  },
  trust: {
    eyebrow: "Güven sistemi",
    title: "Bir ustadan fazlası, güvenilir bir seçim.",
    description:
      "Fuwu, karar anında belirsizliği azaltan bilgileri görünür ve anlaşılır tutar.",
    items: [
      {
        description: "Profilde temel iletişim ve hizmet bilgileri net biçimde yer alır.",
        status: "available",
        title: "Doğrulanmış profil bilgileri",
      },
      {
        description: "Yorum sayısı ve puan bilgisi canlı profillerde birlikte gösterilir.",
        status: "available",
        title: "Gerçek kullanıcı yorumları",
      },
      {
        description: "Puan bilgisi, profilleri hızlıca karşılaştırmana yardımcı olur.",
        status: "available",
        title: "Şeffaf puanlama",
      },
      {
        description: "Tamamlanan iş geçmişini daha görünür kılacak akış geliştiriliyor.",
        status: "planned",
        title: "Hizmet geçmişi",
      },
      {
        description: "Telefon ve WhatsApp bilgileriyle iletişim yolu açık tutulur.",
        status: "available",
        title: "Açık iletişim",
      },
      {
        description: "Sorun bildirim desteği için takip ve değerlendirme akışı planlanıyor.",
        status: "planned",
        title: "Sorun bildirim desteği",
      },
    ],
  },
  experience: {
    eyebrow: "İki taraf için sade akış",
    title: "Kullanıcı da usta da ne yapacağını bilir.",
    description:
      "Platform deneyimi, arama yapan kişinin güvenle seçmesine ve ustanın doğru talebe görünür olmasına odaklanır.",
    cards: [
      {
        actions: ["Hizmeti seç", "Profilleri incele", "Güvenle karar ver"],
        description:
          "Aradığın hizmeti ve ilçeyi seç; uygun profilleri tek ekranda karşılaştır.",
        title: "Hizmet arayanlar için",
      },
      {
        actions: ["Başvurunu gönder", "Hizmet alanını belirt", "Profilin incelensin"],
        description:
          "Uzmanlığını, çalışma bölgeni ve iletişim bilgilerini net bir başvuru ile paylaş.",
        title: "Hizmet verenler için",
      },
    ],
  },
  coverage: {
    eyebrow: "Bölgesel hizmet alanları",
    title: "İstanbul ilçelerinde doğru profili bul.",
    description:
      "İlçe seçimi, sonuçları bulunduğun bölgeye göre daraltır ve karşılaştırmayı pratik hale getirir.",
  },
  finalCta: {
    eyebrow: "Fuwu Hizmet",
    title: "Doğru ustayı bulmak için ilk adımı şimdi at.",
    description:
      "Hizmeti seç, ilçeni belirt ve güven sinyalleri görünür profiller arasından kararını ver.",
    primaryCta: "Usta Bul",
    secondaryCta: "Hizmet Ver",
  },
} as const;

export const homeServiceVisuals: Record<string, { accent: string; iconName: ServiceIconName }> = {
  electrical: { accent: "#F97316", iconName: "bolt" },
  plumbing: { accent: "#2563EB", iconName: "faucet" },
  cleaning: { accent: "#17745F", iconName: "broom" },
  painting: { accent: "#A855F7", iconName: "paint-roller" },
  "climate-appliance-service": { accent: "#0EA5E9", iconName: "air-conditioner" },
  locksmith: { accent: "#D97706", iconName: "key" },
  "furniture-assembly": { accent: "#14213D", iconName: "furniture-tool" },
  "moving-help": { accent: "#64748B", iconName: "truck" },
};
