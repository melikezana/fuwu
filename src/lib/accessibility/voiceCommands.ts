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
      type: "show-providers";
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

const categoryAliases: Array<{ values: string[]; aliases: string[] }> = [
  {
    values: ["Tesisat"],
    aliases: [
      "tesisat ara",
      "tesisatçı ara",
      "tesisatci ara",
      "tesisat",
      "tesisatçı",
      "tesisatci",
      "su tesisatı",
      "su tesisati",
    ],
  },
  {
    values: ["Elektrik Hizmeti", "Elektrik"],
    aliases: [
      "elektrikçi ara",
      "elektrikci ara",
      "elektrik ara",
      "elektrik",
      "elektrikçi",
      "elektrikci",
    ],
  },
  {
    values: ["Temizlik"],
    aliases: ["temizlik ara", "temizlik", "temizlikçi", "temizlikci"],
  },
  {
    values: ["Halı Yıkama"],
    aliases: [
      "halı yıkama ara",
      "hali yikama ara",
      "halı yıkama",
      "hali yikama",
      "halıcı",
      "halici",
    ],
  },
  {
    values: ["Klima & Beyaz Eşya"],
    aliases: ["klima", "beyaz eşya", "beyaz esya", "teknik servis"],
  },
  { values: ["Mobilya Montaj"], aliases: ["mobilya", "montaj", "mobilya montaj"] },
  { values: ["Boya Badana"], aliases: ["boya", "badana", "boyacı", "boyaci"] },
  { values: ["Nakliye Yardımı"], aliases: ["nakliye", "taşıma", "tasima"] },
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

function getAvailableCategoryValue(values: string[], categories: string[] = []) {
  const normalizedValues = values.map((value) => normalizeVoiceText(value));
  const exactCategory = categories.find((category) =>
    normalizedValues.includes(normalizeVoiceText(category)),
  );

  if (exactCategory) {
    return exactCategory;
  }

  const relatedCategory = categories.find((category) => {
    const normalizedCategory = normalizeVoiceText(category);

    return normalizedValues.some(
      (value) => normalizedCategory.includes(value) || value.includes(normalizedCategory),
    );
  });

  return relatedCategory ?? values[0];
}

export function interpretVoiceCommand(
  transcript: string,
  options: {
    categories?: string[];
    districts?: string[];
  } = {},
): VoiceCommandIntent {
  const spokenText = transcript.trim();
  const normalizedText = normalizeVoiceText(spokenText);

  if (!normalizedText) {
    return { type: "unknown", spokenText };
  }

  if (
    includesAny(normalizedText, [
      "ustaları göster",
      "ustalari goster",
      "ustaları listele",
      "ustalari listele",
    ])
  ) {
    return { type: "show-providers", spokenText };
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
      value: getAvailableCategoryValue(categoryMatch.values, options.categories),
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
    "temizlik ara",
    "halı yıkama ara",
    "Kadıköy ustaları",
    "ustaları göster",
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
