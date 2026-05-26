import type { Provider } from "@/types/provider";
import {
  PROVIDER_AVAILABILITY_STATUS_LABELS,
  PROVIDER_AVAILABILITY_STATUS_VALUES,
  type ProviderAvailabilityStatus,
} from "@/lib/constants/statuses";
import { services } from "./services";

export type { Provider };

// Keep this intentionally empty: public provider fallback must not show demo providers as live supply.
export const providers: Provider[] = [];

export const providerCategories = services
  .map((service) => service.title)
  .sort((firstCategory, secondCategory) => firstCategory.localeCompare(secondCategory, "tr"));

export const istanbulDistricts = [
  "Adalar",
  "Arnavutköy",
  "Ataşehir",
  "Avcılar",
  "Bağcılar",
  "Bahçelievler",
  "Bakırköy",
  "Başakşehir",
  "Bayrampaşa",
  "Beşiktaş",
  "Beykoz",
  "Beylikdüzü",
  "Beyoğlu",
  "Büyükçekmece",
  "Çatalca",
  "Çekmeköy",
  "Esenler",
  "Esenyurt",
  "Eyüpsultan",
  "Fatih",
  "Gaziosmanpaşa",
  "Güngören",
  "Kadıköy",
  "Kağıthane",
  "Kartal",
  "Küçükçekmece",
  "Maltepe",
  "Pendik",
  "Sancaktepe",
  "Sarıyer",
  "Silivri",
  "Sultanbeyli",
  "Sultangazi",
  "Şile",
  "Şişli",
  "Tuzla",
  "Ümraniye",
  "Üsküdar",
  "Zeytinburnu",
];

export const providerDistricts = [...istanbulDistricts].sort((firstDistrict, secondDistrict) =>
  firstDistrict.localeCompare(secondDistrict, "tr"),
);

export const providerAveragePrices: string[] = [];

export const providerBudgetOptions = [
  { label: "Ekonomik", value: "ekonomik" },
  { label: "Standart", value: "standart" },
  { label: "Premium", value: "premium" },
  { label: "Acil Hizmet", value: "acil-hizmet" },
] as const;

export type ProviderBudgetValue = (typeof providerBudgetOptions)[number]["value"];

export const providerAvailabilityOptions = [...PROVIDER_AVAILABILITY_STATUS_VALUES];

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

export function getProviderAvailabilityLabel(availability: ProviderAvailabilityStatus) {
  return PROVIDER_AVAILABILITY_STATUS_LABELS[availability];
}

export function getProviderAvailabilityTone(availability: ProviderAvailabilityStatus) {
  if (availability === "müsait") {
    return "green";
  }

  if (availability === "yoğun") {
    return "orange";
  }

  return "neutral";
}

export function getProviderWhatsAppHref(provider: Provider) {
  const whatsappNumber = provider.whatsapp.replace(/\D/g, "");
  const message = encodeURIComponent(
    `Merhaba, Fuwu üzerinden ulaşıyorum. ${provider.district} için ${provider.category} hizmeti almak istiyorum.`,
  );

  return `https://wa.me/${whatsappNumber}?text=${message}`;
}

export function isLiveProvider(provider: Provider) {
  return provider.source === "supabase";
}

export function getProviderProfileBadge(provider: Provider) {
  return isLiveProvider(provider) ? "Onaylı profil" : "Yedek profil";
}

export function getProviderDataNotice(provider: Provider) {
  if (isLiveProvider(provider)) {
    return "Bu profil canlı sağlayıcı kaydından alınır; fiyat ve uygunluk için doğrudan iletişime geçin.";
  }

  return "Bu profil canlı Supabase kaydı değildir; iletişim ve uygunluk bilgisini doğrulayın.";
}
