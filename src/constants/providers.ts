export type Provider = {
  id: string;
  name: string;
  category: string;
  district: string;
  rating: number;
  experience: string;
  averagePrice: string;
  phone: string;
  whatsapp: string;
  availability: string;
  description: string;
  shortDescription: string;
  serviceAreas: string[];
  workingHours: string;
  servicesOffered: string[];
  trustBadges: string[];
  completedJobs: number;
  responseTime: string;
  reviewCount: number;
  featured?: boolean;
  source?: "supabase" | "mock";
};

export const providers: Provider[] = [
  {
    id: "ahmet-usta-tesisat",
    name: "Ahmet Usta",
    category: "Tesisat",
    district: "Kadıköy",
    rating: 4.9,
    experience: "14 yıl",
    averagePrice: "900 - 1.600 TL",
    phone: "+90 532 112 24 68",
    whatsapp: "905321122468",
    availability: "Bugün uygun",
    description:
      "Ahmet Usta; su kaçağı, gider açma ve musluk değişimi gibi günlük tesisat ihtiyaçlarında temiz işçilik ve net fiyat aralığıyla çalışır.",
    shortDescription: "Su kaçağı, gider açma ve musluk değişimi için aynı gün destek.",
    serviceAreas: ["Kadıköy", "Üsküdar", "Ataşehir", "Maltepe"],
    workingHours: "Hafta içi 09:00 - 19:00, Cumartesi 10:00 - 17:00",
    servicesOffered: ["Su kaçağı kontrolü", "Gider açma", "Musluk değişimi", "Sifon tamiri"],
    trustBadges: ["Kimlik kontrolü örneği", "Temiz işçilik notu örneği", "Fatura bilgisi örneği"],
    completedJobs: 460,
    responseTime: "12 dk’da dönüş",
    reviewCount: 96,
    featured: true,
  },
  {
    id: "mehmet-usta-elektrik",
    name: "Mehmet Usta",
    category: "Elektrik",
    district: "Şişli",
    rating: 4.8,
    experience: "11 yıl",
    averagePrice: "750 - 1.400 TL",
    phone: "+90 536 440 19 87",
    whatsapp: "905364401987",
    availability: "Bugün uygun",
    description:
      "Mehmet Usta; priz, avize, sigorta ve küçük elektrik arızalarında güvenlik kontrolünü öne alır, kapsamı işe başlamadan açıklar.",
    shortDescription: "Priz, aydınlatma, sigorta ve küçük arızalarda güvenli servis.",
    serviceAreas: ["Şişli", "Beşiktaş", "Beyoğlu", "Kağıthane"],
    workingHours: "Hafta içi 08:30 - 18:30",
    servicesOffered: ["Priz değişimi", "Avize montajı", "Sigorta kontrolü", "Arıza tespiti"],
    trustBadges: ["Yeterlilik alanı örneği", "Güvenlik kontrolü örneği", "Planlı randevu örneği"],
    completedJobs: 335,
    responseTime: "18 dk’da dönüş",
    reviewCount: 82,
    featured: true,
  },
  {
    id: "zeynep-hanim-temizlik",
    name: "Zeynep Hanım",
    category: "Temizlik",
    district: "Maltepe",
    rating: 4.9,
    experience: "7 yıl",
    averagePrice: "1.100 - 2.200 TL",
    phone: "+90 534 772 18 06",
    whatsapp: "905347721806",
    availability: "Bugün uygun",
    description:
      "Zeynep Hanım; düzenli ev temizliği, detaylı mutfak ve banyo temizliği gibi işlerde planlı, sakin ve güvenilir bir süreç yürütür.",
    shortDescription: "Düzenli ev temizliği ve detaylı temizlik için güvenilir destek.",
    serviceAreas: ["Maltepe", "Kartal", "Kadıköy", "Ataşehir"],
    workingHours: "Salı - Pazar 09:30 - 18:30",
    servicesOffered: ["Haftalık ev temizliği", "Detaylı mutfak temizliği", "Cam temizliği", "Ütü desteği"],
    trustBadges: ["Referans alanı örneği", "Hassas yüzey deneyimi örneği", "Hızlı planlama örneği"],
    completedJobs: 445,
    responseTime: "20 dk’da dönüş",
    reviewCount: 89,
    featured: true,
  },
  {
    id: "cem-hali-yikama",
    name: "Cem Halı Yıkama",
    category: "Halı Yıkama",
    district: "Ümraniye",
    rating: 4.8,
    experience: "9 yıl",
    averagePrice: "300 - 900 TL",
    phone: "+90 532 300 09 00",
    whatsapp: "905323000900",
    availability: "Yarın uygun",
    description:
      "Cem Halı Yıkama; halı yıkama, teslim alma, kurutma ve leke çıkarma işlerinde düzenli takip ve net fiyat aralığıyla çalışır.",
    shortDescription: "Halı yıkama, teslim alma ve leke çıkarma için düzenli servis.",
    serviceAreas: ["Ümraniye", "Ataşehir", "Kadıköy", "Üsküdar"],
    workingHours: "Hafta içi 09:00 - 19:00, Cumartesi 10:00 - 16:00",
    servicesOffered: ["Halı yıkama", "Yerinden teslim alma", "Leke çıkarma", "Kurutma ve paketleme"],
    trustBadges: ["Teslim takibi örneği", "Leke ön kontrolü örneği", "Planlı servis örneği"],
    completedJobs: 240,
    responseTime: "24 dk'da dönüş",
    reviewCount: 54,
  },
  {
    id: "murat-usta-tamir",
    name: "Murat Usta",
    category: "Tamir",
    district: "Ataşehir",
    rating: 4.8,
    experience: "10 yıl",
    averagePrice: "850 - 1.800 TL",
    phone: "+90 537 216 45 90",
    whatsapp: "905372164590",
    availability: "Bugün uygun",
    description:
      "Murat Usta; raf sabitleme, kapı ayarı, dolap tamiri ve küçük ev onarımlarında hızlı keşif ve sağlam teslim yaklaşımıyla çalışır.",
    shortDescription: "Kapı, raf, dolap ve küçük ev tamirlerinde pratik çözüm.",
    serviceAreas: ["Ataşehir", "Kadıköy", "Ümraniye", "Çekmeköy"],
    workingHours: "Hafta içi 10:00 - 19:00, Pazar 11:00 - 16:00",
    servicesOffered: ["Kapı ayarı", "Raf sabitleme", "Dolap tamiri", "Küçük ev onarımı"],
    trustBadges: ["Ekipman bilgisi örneği", "Duvar sabitleme örneği", "Aynı gün destek örneği"],
    completedJobs: 390,
    responseTime: "14 dk’da dönüş",
    reviewCount: 74,
    featured: true,
  },
  {
    id: "ali-usta-klima",
    name: "Ali Usta",
    category: "Klima & Beyaz Eşya",
    district: "Üsküdar",
    rating: 4.9,
    experience: "9 yıl",
    averagePrice: "1.200 - 2.400 TL",
    phone: "+90 533 784 10 44",
    whatsapp: "905337841044",
    availability: "Yarın uygun",
    description:
      "Ali Usta; klima bakım, filtre temizliği, gaz kontrolü ve arıza tespitinde cihaz modeline göre hazırlık yaparak gelir.",
    shortDescription: "Klima bakım, temizlik ve arıza tespiti için düzenli teknik servis.",
    serviceAreas: ["Üsküdar", "Kadıköy", "Ataşehir", "Ümraniye"],
    workingHours: "Her gün 10:00 - 20:00",
    servicesOffered: ["Klima bakımı", "Filtre temizliği", "Gaz kontrolü", "Arıza tespiti"],
    trustBadges: ["Sertifika bilgisi örneği", "Ekipman bilgisi örneği", "Hızlı dönüş örneği"],
    completedJobs: 275,
    responseTime: "16 dk’da dönüş",
    reviewCount: 68,
    featured: true,
  },
  {
    id: "serkan-usta-beyaz-esya",
    name: "Serkan Usta",
    category: "Klima & Beyaz Eşya",
    district: "Bakırköy",
    rating: 4.7,
    experience: "13 yıl",
    averagePrice: "950 - 2.300 TL",
    phone: "+90 539 601 77 23",
    whatsapp: "905396017723",
    availability: "Yarın uygun",
    description:
      "Serkan Usta; çamaşır makinesi, bulaşık makinesi, fırın ve buzdolabı arızalarında yerinde tespit ve parça danışmanlığı sunar.",
    shortDescription: "Beyaz eşya arızalarında yerinde tespit ve parça danışmanlığı.",
    serviceAreas: ["Bakırköy", "Bahçelievler", "Zeytinburnu", "Avcılar"],
    workingHours: "Hafta içi 09:00 - 18:00, Cumartesi 09:00 - 14:00",
    servicesOffered: ["Çamaşır makinesi tamiri", "Bulaşık makinesi tamiri", "Fırın kontrolü", "Buzdolabı arıza tespiti"],
    trustBadges: ["Yerinde tespit örneği", "Servis fişi örneği", "Parça danışmanlığı örneği"],
    completedJobs: 315,
    responseTime: "28 dk’da dönüş",
    reviewCount: 61,
  },
  {
    id: "elif-hanim-mobilya-montaj",
    name: "Elif Hanım",
    category: "Mobilya Montaj",
    district: "Beşiktaş",
    rating: 4.8,
    experience: "8 yıl",
    averagePrice: "800 - 1.700 TL",
    phone: "+90 535 908 34 12",
    whatsapp: "905359083412",
    availability: "Hafta sonu uygun",
    description:
      "Elif Hanım; demonte mobilya, dolap, yatak, masa ve raf montajında parça kontrolüyle başlayıp sağlamlık kontrolüyle teslim eder.",
    shortDescription: "Dolap, yatak, masa ve raf montajında düzenli kurulum.",
    serviceAreas: ["Beşiktaş", "Şişli", "Sarıyer", "Beyoğlu"],
    workingHours: "Pazartesi - Cumartesi 09:00 - 18:00",
    servicesOffered: ["Demonte mobilya montajı", "Raf sabitleme", "Dolap kurulumu", "Masa montajı"],
    trustBadges: ["Parça kontrolü örneği", "Temiz teslim örneği", "Planlı randevu örneği"],
    completedJobs: 520,
    responseTime: "25 dk’da dönüş",
    reviewCount: 110,
  },
  {
    id: "hasan-usta-boya-badana",
    name: "Hasan Usta",
    category: "Boya Badana",
    district: "Fatih",
    rating: 4.7,
    experience: "16 yıl",
    averagePrice: "3.500 - 8.000 TL",
    phone: "+90 538 245 92 31",
    whatsapp: "905382459231",
    availability: "Hafta sonu uygun",
    description:
      "Hasan Usta; boya badana işlerinde alan koruma, yüzey hazırlığı ve temiz teslim konularına özellikle dikkat eder.",
    shortDescription: "Oda yenileme, rötuş ve boya badana işlerinde temiz teslim.",
    serviceAreas: ["Fatih", "Zeytinburnu", "Eminönü", "Beyoğlu"],
    workingHours: "Hafta içi 08:00 - 18:00, Cumartesi 09:00 - 16:00",
    servicesOffered: ["İç cephe boya", "Tavan boyası", "Rötuş", "Yüzey hazırlığı"],
    trustBadges: ["Koruyucu kaplama örneği", "Zamanında teslim örneği", "Malzeme danışmanlığı örneği"],
    completedJobs: 610,
    responseTime: "30 dk’da dönüş",
    reviewCount: 104,
  },
  {
    id: "emre-usta-nakliye-yardimi",
    name: "Emre Usta",
    category: "Nakliye Yardımı",
    district: "Ümraniye",
    rating: 4.8,
    experience: "12 yıl",
    averagePrice: "1.500 - 4.500 TL",
    phone: "+90 532 640 83 17",
    whatsapp: "905326408317",
    availability: "Bugün uygun",
    description:
      "Emre Usta; küçük eşya taşıma, koli desteği, apartman içi taşıma ve araçlı nakliye yardımı için planlı ekip çalışması sunar.",
    shortDescription: "Küçük eşya taşıma ve araçlı nakliye yardımı için hızlı destek.",
    serviceAreas: ["Ümraniye", "Ataşehir", "Kadıköy", "Üsküdar"],
    workingHours: "Her gün 08:00 - 20:00",
    servicesOffered: ["Küçük eşya taşıma", "Koli taşıma", "Araçlı nakliye yardımı", "Apartman içi taşıma"],
    trustBadges: ["Planlı taşıma örneği", "Araç desteği örneği", "Hızlı keşif örneği"],
    completedJobs: 285,
    responseTime: "22 dk’da dönüş",
    reviewCount: 58,
  },
];

export const providerCategories = Array.from(
  new Set(providers.map((provider) => provider.category)),
).sort((firstCategory, secondCategory) => firstCategory.localeCompare(secondCategory, "tr"));

export const providerDistricts = Array.from(
  new Set(providers.flatMap((provider) => [provider.district, ...provider.serviceAreas])),
).sort((firstDistrict, secondDistrict) => firstDistrict.localeCompare(secondDistrict, "tr"));

export const providerAveragePrices = Array.from(
  new Set(providers.map((provider) => provider.averagePrice)),
);

export const providerAvailabilityOptions = Array.from(
  new Set(providers.map((provider) => provider.availability)),
);

export const minimumRatingOptions = [
  { label: "4,9 ve üzeri", value: "4.9" },
  { label: "4,8 ve üzeri", value: "4.8" },
  { label: "4,7 ve üzeri", value: "4.7" },
  { label: "4,6 ve üzeri", value: "4.6" },
];

export function getProviderById(id: string) {
  return providers.find((provider) => provider.id === id);
}

export function getProviderInitials(provider: Provider) {
  return provider.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("tr");
}

export function getProviderPhoneHref(provider: Provider) {
  return `tel:${provider.phone.replace(/[^\d+]/g, "")}`;
}

export function getProviderWhatsAppHref(provider: Provider) {
  const message = encodeURIComponent(
    `Merhaba ${provider.name}, Fuwu profilinizi gördüm. ${provider.category} hizmeti için bilgi almak istiyorum.`,
  );

  return `https://wa.me/${provider.whatsapp}?text=${message}`;
}

export function isLiveProvider(provider: Provider) {
  return provider.source === "supabase";
}

export function getProviderProfileBadge(provider: Provider) {
  return isLiveProvider(provider) ? "Onaylı profil" : "Örnek profil";
}

export function getProviderDataNotice(provider: Provider) {
  if (isLiveProvider(provider)) {
    return "Bu profil canlı sağlayıcı kaydından alınır; fiyat ve uygunluk için doğrudan iletişime geçin.";
  }

  return "Örnek veri; doğrulama, yorum ve iletişim bilgileri canlı kayıt değildir.";
}
