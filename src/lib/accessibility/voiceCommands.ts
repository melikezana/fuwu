import type { Provider } from "@/types/provider";
import { normalizeServiceValue, services } from "@/lib/constants/services";

export type VoiceCommandIntent =
  | {
      type: "category";
      value: string;
      spokenText: string;
    }
  | {
      type: "district";
      value: string;
      spokenText: string;
    }
  | {
      type: "whatsapp";
      spokenText: string;
    }
  | {
      type: "read-profiles";
      spokenText: string;
    }
  | {
      type: "unknown";
      spokenText: string;
    };

const categoryAliases: Array<{ value: string; aliases: string[] }> = [
  { value: "Tesisat", aliases: ["tesisat", "tesisatçı", "tesisatci", "su tesisatı", "su tesisati"] },
  { value: "Elektrik", aliases: ["elektrik", "elektrikçi", "elektrikci"] },
  { value: "Temizlik", aliases: ["temizlik", "temizlikçi", "temizlikci"] },
  { value: "Halı Yıkama", aliases: ["halı yıkama", "hali yikama", "halıcı", "halici"] },
  {
    value: "Klima & Beyaz Eşya",
    aliases: ["klima", "beyaz eşya", "beyaz esya", "teknik servis"],
  },
  { value: "Mobilya Montaj", aliases: ["mobilya", "montaj", "mobilya montaj"] },
  { value: "Boya Badana", aliases: ["boya", "badana", "boyacı", "boyaci"] },
  { value: "Nakliye Yardımı", aliases: ["nakliye", "taşıma", "tasima"] },
];

const defaultDistricts = [
  "Ataşehir",
  "Bakırköy",
  "Beşiktaş",
  "Kadıköy",
  "Maltepe",
  "Şişli",
  "Ümraniye",
  "Üsküdar",
];

function normalizeVoiceText(value: string) {
  return normalizeServiceValue(value);
}

function includesAny(normalizedText: string, aliases: string[]) {
  return aliases.some((alias) => normalizedText.includes(normalizeVoiceText(alias)));
}

export function interpretVoiceCommand(
  transcript: string,
  options: {
    districts?: string[];
  } = {},
): VoiceCommandIntent {
  const spokenText = transcript.trim();
  const normalizedText = normalizeVoiceText(spokenText);

  if (!normalizedText) {
    return { type: "unknown", spokenText };
  }

  if (includesAny(normalizedText, ["profilleri oku", "ustaları oku", "ustalari oku"])) {
    return { type: "read-profiles", spokenText };
  }

  if (includesAny(normalizedText, ["whatsapp ile yaz", "whatsappla yaz", "mesaj yaz"])) {
    return { type: "whatsapp", spokenText };
  }

  const categoryMatch = categoryAliases.find((category) =>
    includesAny(normalizedText, category.aliases),
  );

  if (categoryMatch) {
    return {
      type: "category",
      value: categoryMatch.value,
      spokenText,
    };
  }

  const districts = [...new Set([...(options.districts ?? []), ...defaultDistricts])];
  const districtMatch = districts.find((district) => normalizedText.includes(normalizeVoiceText(district)));

  if (districtMatch) {
    return {
      type: "district",
      value: districtMatch,
      spokenText,
    };
  }

  return { type: "unknown", spokenText };
}

export function getKnownVoiceCommandExamples() {
  return [
    "tesisatçı ara",
    "elektrikçi ara",
    "Kadıköy ustaları",
    "WhatsApp ile yaz",
    "profilleri oku",
  ];
}

export function getVoiceCommandCategories() {
  return services.map((service) => service.title);
}

export function getProviderSpeechSummary(provider: Provider) {
  return `${provider.name}, ${provider.district}, ${provider.category}, ${provider.rating.toFixed(
    1,
  )} puan, fiyat aralığı ${provider.averagePrice}`;
}

export function readProviderSummaries(providers: Provider[]) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return {
      ok: false,
      message: "Bu tarayıcı sesli okumayı desteklemiyor.",
    };
  }

  if (providers.length === 0) {
    return {
      ok: false,
      message: "Sesli okunacak profil bulunamadı.",
    };
  }

  const summaries = providers.slice(0, 6).map(getProviderSpeechSummary);
  const utterance = new SpeechSynthesisUtterance(summaries.join(". "));

  utterance.lang = "tr-TR";
  utterance.rate = 0.92;
  utterance.pitch = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);

  return {
    ok: true,
    message:
      providers.length > 6
        ? "İlk 6 profil sesli okunuyor."
        : "Profiller sesli okunuyor.",
  };
}
