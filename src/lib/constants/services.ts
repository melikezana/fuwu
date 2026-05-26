export type ServiceIconName =
  | "air-conditioner"
  | "appliance"
  | "bolt"
  | "broom"
  | "calendar-check"
  | "box"
  | "faucet"
  | "furniture-tool"
  | "graduation-cap"
  | "home"
  | "paint-roller"
  | "pipe"
  | "rug"
  | "sparkles"
  | "leaf"
  | "droplets"
  | "truck"
  | "wrench";

export type Service = {
  id: string;
  category: string;
  title: string;
  description: string;
  iconName: ServiceIconName;
  startingHint: string;
  href: string;
};

export const services: Service[] = [
  {
    id: "plumbing",
    category: "Onarım",
    title: "Tesisat",
    description:
      "Su kaçağı, gider açma ve musluk değişimi için yakındaki tesisatçıları karşılaştır.",
    iconName: "faucet",
    startingHint: "Usta Bul",
    href: "/providers?category=tesisat",
  },
  {
    id: "locksmith",
    category: "Acil",
    title: "Çilingir",
    description:
      "Kapıda kalma, kilit değiştirme ve oto çilingir ihtiyaçları için hemen usta bul.",
    iconName: "bolt",
    startingHint: "Usta Bul",
    href: "/providers?category=cilingir",
  },
  {
    id: "garden",
    category: "Dış Mekan",
    title: "Bahçe Bakımı",
    description: "Bahçe düzenleme, bakım ve temizlik",
    iconName: "leaf",
    startingHint: "Usta Bul",
    href: "/providers?category=bahce-bakimi",
  },
  {
    id: "pool",
    category: "Dış Mekan",
    title: "Havuz Bakımı",
    description: "Havuz temizlik, bakım ve kontrol",
    iconName: "droplets",
    startingHint: "Usta Bul",
    href: "/providers?category=havuz-bakimi",
  },
  {
    id: "electrical",
    category: "Onarım",
    title: "Elektrik",
    description:
      "Priz, aydınlatma, sigorta ve arıza tespitinde güvenilir elektrik ustalarını gör.",
    iconName: "bolt",
    startingHint: "Usta Bul",
    href: "/providers?category=elektrik",
  },
  {
    id: "cleaning",
    category: "Ev Bakımı",
    title: "Temizlik",
    description:
      "Ev, ofis ve taşınma sonrası temizlik için uygun profilleri hızlıca listele.",
    iconName: "broom",
    startingHint: "Usta Bul",
    href: "/providers?category=temizlik",
  },
  {
    id: "carpet-cleaning",
    category: "Ev Bakımı",
    title: "Halı Yıkama",
    description:
      "Halı yıkama, teslim alma ve leke çıkarma için uygun profilleri karşılaştır.",
    iconName: "rug",
    startingHint: "Usta Bul",
    href: "/providers?category=hali-yikama",
  },
  {
    id: "climate-appliance-service",
    category: "Teknik Servis",
    title: "Klima & Beyaz Eşya",
    description:
      "Klima bakımı, montajı ve beyaz eşya arızaları için uygun teknik servisleri karşılaştır.",
    iconName: "air-conditioner",
    startingHint: "Usta Bul",
    href: "/providers?category=klima-beyaz-esya",
  },
  {
    id: "furniture-assembly",
    category: "Montaj",
    title: "Mobilya Montaj",
    description:
      "Dolap, yatak, masa ve raf montajında deneyimli ustalara hemen ulaş.",
    iconName: "furniture-tool",
    startingHint: "Usta Bul",
    href: "/providers?category=mobilya-montaj",
  },
  {
    id: "painting",
    category: "Proje",
    title: "Boya Badana",
    description:
      "Boya badana, rötuş ve yüzey hazırlığı için fiyat aralığını gör, usta seç.",
    iconName: "paint-roller",
    startingHint: "Usta Bul",
    href: "/providers?category=boya-badana",
  },
  {
    id: "moving-help",
    category: "Taşıma",
    title: "Nakliye Yardımı",
    description:
      "Koli taşıma, küçük eşya nakli ve apartman içi taşıma desteği için usta bul.",
    iconName: "truck",
    startingHint: "Usta Bul",
    href: "/providers?category=nakliye-yardimi",
  },
];

export function normalizeServiceValue(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getServiceIconNameForCategory(category: string): ServiceIconName {
  const normalizedCategory = normalizeServiceValue(category);
  const matchingService = services.find((service) => {
    const normalizedTitle = normalizeServiceValue(service.title);
    const normalizedHref = normalizeServiceValue(service.href);

    return (
      normalizedTitle === normalizedCategory ||
      normalizedTitle.includes(normalizedCategory) ||
      normalizedCategory.includes(normalizedTitle) ||
      normalizedHref.includes(normalizedCategory)
    );
  });

  return matchingService?.iconName ?? "wrench";
}
