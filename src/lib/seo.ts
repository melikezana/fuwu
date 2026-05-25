import type { Metadata } from "next";

export const seoConfig = {
  brandName: "Fuwu",
  legalName: "FUWU",
  siteName: "Fuwu Hizmet",
  domain: "fuwu.com.tr",
  siteUrl: "https://fuwu.com.tr",
  twitterHandle: "@fuwuapp",
  titleTemplate: "%s | Fuwu",
  defaultTitle: "Fuwu | Ev Hizmetleri Platformu",
  defaultDescription:
    "İstanbul’da tesisatçı, elektrikçi, temizlik ve ev hizmeti ustalarını karşılaştır; telefon veya WhatsApp ile direkt iletişime geç.",
  ogImagePath: "/og/fuwu-og-placeholder.svg",
  locale: "tr_TR",
} as const;

export const defaultKeywords = [
  "FUWU",
  "Fuwu Hizmet",
  "fuwu.com.tr",
  "İstanbul ev hizmetleri",
  "tesisatçı",
  "elektrikçi",
  "temizlik hizmeti",
  "usta bul",
  "WhatsApp ile usta",
  "ev hizmeti platformu",
];

export const defaultOpenGraphImage = {
  url: seoConfig.ogImagePath,
  width: 1200,
  height: 630,
  alt: "FUWU - Fuwu Hizmet",
} as const;

export const indexableRobots = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
} satisfies NonNullable<Metadata["robots"]>;

export const nonIndexableRobots = {
  index: false,
  follow: false,
  googleBot: {
    index: false,
    follow: false,
  },
} satisfies NonNullable<Metadata["robots"]>;

type PageMetadataInput = {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
  noIndex?: boolean;
};

const categoryLabels: Record<string, { listing: string; profession: string }> = {
  tesisat: {
    listing: "Tesisatçılar",
    profession: "Tesisatçı",
  },
  elektrik: {
    listing: "Elektrik Hizmeti Ustaları",
    profession: "Elektrikçi",
  },
  temizlik: {
    listing: "Temizlik Hizmeti Ustaları",
    profession: "Temizlik Hizmeti",
  },
  "hali yikama": {
    listing: "Halı Yıkama Hizmetleri",
    profession: "Halı Yıkama Hizmeti",
  },
  "klima beyaz esya": {
    listing: "Klima ve Beyaz Eşya Servisleri",
    profession: "Klima ve Beyaz Eşya Servisi",
  },
  "mobilya montaj": {
    listing: "Mobilya Montaj Ustaları",
    profession: "Mobilya Montaj Ustası",
  },
  "boya badana": {
    listing: "Boya Badana Ustaları",
    profession: "Boyacı",
  },
  "nakliye yardimi": {
    listing: "Nakliye Yardımı Ustaları",
    profession: "Nakliye Yardımı",
  },
  tamir: {
    listing: "Tamir Ustaları",
    profession: "Tamirci",
  },
  cilingir: {
    listing: "Çilingirler",
    profession: "Çilingir",
  },
  "bahce bakimi": {
    listing: "Bahçe Bakımı Hizmetleri",
    profession: "Bahçe Bakımı Ustası",
  },
  "havuz bakimi": {
    listing: "Havuz Bakımı Hizmetleri",
    profession: "Havuz Bakımı Ustası",
  },
};

export function createAbsoluteUrl(path = "/") {
  return new URL(path, seoConfig.siteUrl).toString();
}

export function createCanonicalPath(path = "/") {
  if (!path.trim()) {
    return "/";
  }

  return path.startsWith("/") ? path : `/${path}`;
}

export function createPageMetadata({
  title,
  description,
  path = "/",
  keywords = [],
  noIndex = false,
}: PageMetadataInput): Metadata {
  const mergedKeywords = Array.from(new Set([...defaultKeywords, ...keywords].filter(Boolean)));
  const canonicalPath = createCanonicalPath(path);

  return {
    title: {
      absolute: title,
    },
    description,
    keywords: mergedKeywords,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      url: canonicalPath,
      siteName: seoConfig.siteName,
      locale: seoConfig.locale,
      type: "website",
      images: [defaultOpenGraphImage],
    },
    twitter: {
      card: "summary_large_image",
      site: seoConfig.twitterHandle,
      creator: seoConfig.twitterHandle,
      title,
      description,
      images: [seoConfig.ogImagePath],
    },
    robots: noIndex ? nonIndexableRobots : indexableRobots,
  };
}

export function normalizeSeoValue(value: string) {
  return decodeSeoValue(value)
    .trim()
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/İ/g, "i")
    .replace(/Ğ/g, "g")
    .replace(/Ü/g, "u")
    .replace(/Ş/g, "s")
    .replace(/Ö/g, "o")
    .replace(/Ç/g, "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function decodeSeoValue(value: string) {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
}

export function toTurkishTitleCase(value: string) {
  return decodeSeoValue(value)
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      const [firstLetter = "", ...rest] = word;

      return `${firstLetter.toLocaleUpperCase("tr")}${rest.join("").toLocaleLowerCase("tr")}`;
    })
    .join(" ");
}

export function getProviderProfessionLabel(category: string) {
  const normalizedCategory = normalizeSeoValue(category);

  return categoryLabels[normalizedCategory]?.profession ?? `${toTurkishTitleCase(category)} Ustası`;
}

export function getProviderListingLabel(category: string) {
  const normalizedCategory = normalizeSeoValue(category);

  return categoryLabels[normalizedCategory]?.listing ?? `${toTurkishTitleCase(category)} Ustaları`;
}
