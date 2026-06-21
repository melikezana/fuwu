import {
  serviceCategories,
  type ServiceIconName,
} from "@/lib/constants/services";

export type InstantMatchServiceOption = {
  iconName: ServiceIconName;
  label: string;
  matchCategory: string;
  value: string;
};

export type InstantMatchTimeValue = "bugun" | "yarin" | "bu-hafta" | "esnek";

export type InstantMatchTimeOption = {
  description: string;
  label: string;
  value: InstantMatchTimeValue;
};

export const instantMatchServiceOptions: readonly InstantMatchServiceOption[] =
  serviceCategories.map((service) => ({
    iconName: service.iconName,
    label: service.title,
    matchCategory: service.title,
    value: service.title,
  }));

export const instantMatchTimeOptions = [
  {
    label: "Bugün",
    value: "bugun",
    description: "En hızlı dönüş için acil profilleri öne alır.",
  },
  {
    label: "Yarın",
    value: "yarin",
    description: "Yakın tarihli uygunlukları önceliklendirir.",
  },
  {
    label: "Bu hafta",
    value: "bu-hafta",
    description: "Birkaç gün içinde destek arayanlar için.",
  },
  {
    label: "Esnek",
    value: "esnek",
    description: "Fiyat ve profil karşılaştırmasına alan bırakır.",
  },
] as const satisfies readonly InstantMatchTimeOption[];
