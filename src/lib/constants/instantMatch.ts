import type { ServiceIconName } from "@/lib/constants/services";

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

export const instantMatchServiceOptions = [
  { label: "Tesisat", value: "Tesisat", matchCategory: "Tesisat", iconName: "faucet" },
  { label: "Elektrik", value: "Elektrik", matchCategory: "Elektrik", iconName: "bolt" },
  { label: "Temizlik", value: "Temizlik", matchCategory: "Temizlik", iconName: "broom" },
  { label: "Boya", value: "Boya", matchCategory: "Boya Badana", iconName: "paint-roller" },
  { label: "Montaj", value: "Montaj", matchCategory: "Mobilya Montaj", iconName: "furniture-tool" },
  { label: "Halı Yıkama", value: "Halı Yıkama", matchCategory: "Halı Yıkama", iconName: "rug" },
  { label: "Bahçe Bakımı", value: "Bahçe Bakımı", matchCategory: "Bahçe Bakımı", iconName: "leaf" },
  { label: "Havuz Bakımı", value: "Havuz Bakımı", matchCategory: "Havuz Bakımı", iconName: "droplets" },
  {
    label: "Klima / Beyaz Eşya",
    value: "Klima / Beyaz Eşya",
    matchCategory: "Klima & Beyaz Eşya",
    iconName: "air-conditioner",
  },
  { label: "Diğer", value: "Diğer", matchCategory: "Diğer", iconName: "wrench" },
] as const satisfies readonly InstantMatchServiceOption[];

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
