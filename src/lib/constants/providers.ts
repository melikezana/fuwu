import type { Provider } from "@/types/provider";
import { services } from "./services";

export type { Provider };

export const providers: Provider[] = [];

export const providerCategories = services
  .map((service) => service.title)
  .sort((firstCategory, secondCategory) => firstCategory.localeCompare(secondCategory, "tr"));

export const providerDistricts = [
  "Ataşehir",
  "Bakırköy",
  "Beşiktaş",
  "Kadıköy",
  "Maltepe",
  "Şişli",
  "Ümraniye",
  "Üsküdar",
].sort((firstDistrict, secondDistrict) => firstDistrict.localeCompare(secondDistrict, "tr"));

export const providerAveragePrices: string[] = [];

export const providerAvailabilityOptions = [
  "Bugün uygun",
  "Yarın uygun",
  "Hafta sonu uygun",
];

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
  return isLiveProvider(provider) ? "Onaylı profil" : "Yedek profil";
}

export function getProviderDataNotice(provider: Provider) {
  if (isLiveProvider(provider)) {
    return "Bu profil canlı sağlayıcı kaydından alınır; fiyat ve uygunluk için doğrudan iletişime geçin.";
  }

  return "Bu profil canlı Supabase kaydı değildir; iletişim ve uygunluk bilgisini doğrulayın.";
}
