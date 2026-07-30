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
  | "key"
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
  slug: string;
  startingHint: string;
  href: string;
};

export function createProviderCategoryHref(slug: string) {
  const params = new URLSearchParams({ category: slug });

  return `/providers?${params.toString()}`;
}

export const serviceCategories = [
  {
    id: "plumbing",
    category: "Onarım",
    title: "Su Tesisatı",
    description:
      "Su kaçağı, gider açma ve musluk değişimi için yakındaki tesisatçıları karşılaştır.",
    iconName: "faucet",
    slug: "tesisat",
    startingHint: "Usta Bul",
    href: createProviderCategoryHref("tesisat"),
  },
  {
    id: "locksmith",
    category: "Acil",
    title: "Çilingir",
    description:
      "Kapıda kalma, kilit değiştirme ve oto çilingir ihtiyaçları için hemen usta bul.",
    iconName: "key",
    slug: "cilingir",
    startingHint: "Usta Bul",
    href: createProviderCategoryHref("cilingir"),
  },
  {
    id: "electrical",
    category: "Onarım",
    title: "Elektrik",
    description:
      "Priz, aydınlatma, sigorta ve arıza tespitinde güvenilir elektrik ustalarını gör.",
    iconName: "bolt",
    slug: "elektrik-hizmeti",
    startingHint: "Usta Bul",
    href: createProviderCategoryHref("elektrik-hizmeti"),
  },
  {
    id: "cleaning",
    category: "Ev Bakımı",
    title: "Temizlik",
    description:
      "Ev, ofis ve taşınma sonrası temizlik için uygun profilleri hızlıca listele.",
    iconName: "broom",
    slug: "temizlik",
    startingHint: "Usta Bul",
    href: createProviderCategoryHref("temizlik"),
  },
  {
    id: "carpet-cleaning",
    category: "Ev Bakımı",
    title: "Halı Yıkama",
    description:
      "Halı yıkama, teslim alma ve leke çıkarma için uygun profilleri karşılaştır.",
    iconName: "rug",
    slug: "hali-yikama",
    startingHint: "Usta Bul",
    href: createProviderCategoryHref("hali-yikama"),
  },
  {
    id: "climate-appliance-service",
    category: "Teknik Servis",
    title: "Klima",
    description:
      "Klima bakımı, montajı ve beyaz eşya arızaları için uygun teknik servisleri karşılaştır.",
    iconName: "air-conditioner",
    slug: "klima-beyaz-esya",
    startingHint: "Usta Bul",
    href: createProviderCategoryHref("klima-beyaz-esya"),
  },
  {
    id: "furniture-assembly",
    category: "Montaj",
    title: "Mobilya Montaj",
    description:
      "Dolap, yatak, masa ve raf montajında deneyimli ustalara hemen ulaş.",
    iconName: "furniture-tool",
    slug: "mobilya-montaj",
    startingHint: "Usta Bul",
    href: createProviderCategoryHref("mobilya-montaj"),
  },
  {
    id: "painting",
    category: "Proje",
    title: "Boya Badana",
    description:
      "Boya badana, rötuş ve yüzey hazırlığı için fiyat aralığını gör, usta seç.",
    iconName: "paint-roller",
    slug: "boya-badana",
    startingHint: "Usta Bul",
    href: createProviderCategoryHref("boya-badana"),
  },
  {
    id: "moving-help",
    category: "Taşıma",
    title: "Nakliye Yardımı",
    description:
      "Koli taşıma, küçük eşya nakli ve apartman içi taşıma desteği için usta bul.",
    iconName: "truck",
    slug: "nakliye-yardimi",
    startingHint: "Usta Bul",
    href: createProviderCategoryHref("nakliye-yardimi"),
  },
] as const satisfies readonly Service[];

export const services = serviceCategories;

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
