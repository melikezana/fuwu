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
  aliases?: readonly string[];
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
    id: "electrical",
    category: "Onarım",
    title: "Elektrik",
    description:
      "Priz, aydınlatma, sigorta ve arıza tespitinde güvenilir elektrik ustalarını gör.",
    iconName: "bolt",
    slug: "elektrik-hizmeti",
    aliases: ["Elektrik Hizmeti"],
    startingHint: "Usta Bul",
    href: createProviderCategoryHref("elektrik-hizmeti"),
  },
  {
    id: "plumbing",
    category: "Onarım",
    title: "Tesisat",
    description:
      "Su kaçağı, musluk, gider, boru ve tesisat çözümleri.",
    iconName: "faucet",
    slug: "tesisat",
    aliases: ["Su Tesisatı", "su-tesisati"],
    startingHint: "Usta Bul",
    href: createProviderCategoryHref("tesisat"),
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
    id: "climate-appliance-service",
    category: "Teknik Servis",
    title: "Beyaz Eşya",
    description:
      "Klima, buzdolabı, çamaşır ve bulaşık makinesi için teknik servis.",
    iconName: "air-conditioner",
    slug: "klima-beyaz-esya",
    aliases: ["Klima", "Klima & Beyaz Eşya", "Klima ve Beyaz Eşya", "klima"],
    startingHint: "Usta Bul",
    href: createProviderCategoryHref("klima-beyaz-esya"),
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
    id: "furniture-assembly",
    category: "Montaj",
    title: "Mobilya Montajı",
    description:
      "Dolap, yatak, masa ve raf montajında deneyimli ustalara hemen ulaş.",
    iconName: "furniture-tool",
    slug: "mobilya-montaj",
    aliases: ["Mobilya Montaj"],
    startingHint: "Usta Bul",
    href: createProviderCategoryHref("mobilya-montaj"),
  },
  {
    id: "moving-help",
    category: "Taşıma",
    title: "Nakliye",
    description:
      "Koli taşıma, küçük eşya nakli ve apartman içi taşıma desteği için usta bul.",
    iconName: "truck",
    slug: "nakliye-yardimi",
    aliases: ["Nakliye Yardımı"],
    startingHint: "Usta Bul",
    href: createProviderCategoryHref("nakliye-yardimi"),
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
    id: "pool-garden",
    category: "Dış Mekan",
    title: "Havuz ve Bahçe Bakımı",
    description:
      "Bahçe düzenleme, havuz temizliği ve dış mekan bakımı için uygun ustaları karşılaştır.",
    iconName: "leaf",
    slug: "havuz-bahce-bakimi",
    aliases: ["Bahçe Bakımı", "Bahçe düzenleme", "Havuz Bakımı", "havuz-bakimi", "bahce-bakimi"],
    startingHint: "Usta Bul",
    href: createProviderCategoryHref("havuz-bahce-bakimi"),
  },
  {
    id: "renovation",
    category: "Proje",
    title: "Ev Tadilatı",
    description:
      "Küçük tadilat, yenileme ve ev iyileştirme işleri için uygun profilleri incele.",
    iconName: "home",
    slug: "ev-tadilati",
    aliases: ["Tadilat", "Ev tadilati", "Renovasyon"],
    startingHint: "Usta Bul",
    href: createProviderCategoryHref("ev-tadilati"),
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

export function getServiceForValue(value: string | null | undefined) {
  const normalizedValue = normalizeServiceValue(value ?? "");

  if (!normalizedValue) {
    return null;
  }

  return (
    services.find((service) => {
      const aliases = "aliases" in service ? service.aliases : [];
      const searchableValues = [
        service.id,
        service.slug,
        service.title,
        service.href,
        ...(aliases ?? []),
      ];

      return searchableValues.some((searchableValue) => {
        const normalizedSearchableValue = normalizeServiceValue(searchableValue);

        return (
          normalizedSearchableValue === normalizedValue ||
          normalizedSearchableValue.includes(normalizedValue) ||
          normalizedValue.includes(normalizedSearchableValue)
        );
      });
    }) ?? null
  );
}

export function getServiceDisplayLabel(value: string | null | undefined) {
  return getServiceForValue(value)?.title ?? value ?? "";
}

export function getServiceFilterValue(value: string | null | undefined) {
  return getServiceForValue(value)?.slug ?? value ?? "";
}

export function getServiceCategorySearchValues(value: string | null | undefined) {
  const service = getServiceForValue(value);

  if (!service) {
    return [value ?? ""].filter(Boolean);
  }

  const aliases = "aliases" in service ? service.aliases : [];

  return [service.title, service.slug, service.id, ...(aliases ?? [])].filter(Boolean);
}

export function getServiceIconNameForCategory(category: string): ServiceIconName {
  const normalizedCategory = normalizeServiceValue(category);
  const matchingService = getServiceForValue(category);

  if (matchingService) {
    return matchingService.iconName;
  }

  return services.find((service) => normalizeServiceValue(service.href).includes(normalizedCategory))
    ?.iconName ?? "wrench";
}
