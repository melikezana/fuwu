import { normalizeServiceValue, services } from "@/lib/constants/services";
import { providerDistricts } from "@/lib/constants/providers";
import type { ProviderSortValue } from "@/lib/provider-filters";
export {
  getProviderSpeechSummary,
  readProviderSummaries,
} from "@/lib/accessibility/providerReadout";

export type VoiceCommandIntent =
  | {
      district: string;
      spokenText: string;
      type: "category-district";
      value: string;
    }
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
      type: "emergency";
      spokenText: string;
    }
  | {
      type: "show-providers";
      spokenText: string;
    }
  | {
      category?: string;
      district?: string;
      sort?: ProviderSortValue;
      spokenText: string;
      type: "provider-filters";
      verified?: boolean;
    }
  | {
      type: "proximity-unavailable";
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
      type: "reset";
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
    values: ["Beyaz Eşya"],
    aliases: ["klima", "beyaz eşya", "beyaz esya", "teknik servis"],
  },
  { values: ["Mobilya Montajı"], aliases: ["mobilya", "montaj", "mobilya montaj"] },
  { values: ["Boya Badana"], aliases: ["boya", "badana", "boyacı", "boyaci"] },
  { values: ["Nakliye"], aliases: ["nakliye", "taşıma", "tasima"] },
  {
    values: ["Havuz ve Bahçe Bakımı"],
    aliases: ["bahçe", "bahce", "havuz", "peyzaj", "dış mekan", "dis mekan"],
  },
  { values: ["Ev Tadilatı"], aliases: ["tadilat", "ev tadilatı", "ev tadilati"] },
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

function getCategoryMatchFromOptions(normalizedText: string, categories: string[] = []) {
  const categoryOptions = [...new Set([...categories, ...services.map((service) => service.title)])];

  return categoryOptions.find((category) => {
    const normalizedCategory = normalizeVoiceText(category);

    return (
      normalizedText === normalizedCategory ||
      normalizedText.includes(normalizedCategory) ||
      normalizedText.includes(`${normalizedCategory} ara`) ||
      normalizedText.includes(`${normalizedCategory} usta`) ||
      normalizedText.includes(`${normalizedCategory} ustalari`)
    );
  });
}

function getCategoryMatch(normalizedText: string, categories: string[] = []) {
  const categoryMatch = categoryAliases.find((category) =>
    includesAny(normalizedText, category.aliases),
  );

  if (categoryMatch) {
    return getAvailableCategoryValue(categoryMatch.values, categories);
  }

  return getCategoryMatchFromOptions(normalizedText, categories) ?? null;
}

function getDistrictMatch(normalizedText: string, districts: string[] = []) {
  const districtOptions = [...new Set([...districts, ...providerDistricts])];

  return (
    districtOptions.find((district) =>
      normalizedText.includes(normalizeVoiceText(district)),
    ) ?? null
  );
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

  if (includesAny(normalizedText, ["sıfırla", "sifirla", "reset"])) {
    return { type: "reset", spokenText };
  }

  if (
    includesAny(normalizedText, [
      "acil usta çağır",
      "acil usta cagir",
      "acil usta",
      "acil hizmet",
    ])
  ) {
    return { type: "emergency", spokenText };
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

  const categoryMatch = getCategoryMatch(normalizedText, options.categories);
  const districtMatch = getDistrictMatch(normalizedText, options.districts);
  const wantsVerified = includesAny(normalizedText, [
    "doğrulanmış",
    "dogrulanmis",
    "onaylı",
    "onayli",
  ]);
  const wantsHighestRated = includesAny(normalizedText, [
    "en yüksek puan",
    "en yuksek puan",
    "yüksek puanlı",
    "yuksek puanli",
    "puanlı",
    "puanli",
  ]);
  const wantsFastestResponse = includesAny(normalizedText, [
    "en hızlı yanıt",
    "en hizli yanit",
    "hızlı yanıt",
    "hizli yanit",
    "hızlı dönüş",
    "hizli donus",
  ]);
  const wantsProximity = includesAny(normalizedText, [
    "yakınımdaki",
    "yakinimdaki",
    "en yakın",
    "en yakin",
    "yakındaki",
    "yakindaki",
  ]);

  if (wantsProximity) {
    return { type: "proximity-unavailable", spokenText };
  }

  if (wantsVerified || wantsHighestRated || wantsFastestResponse) {
    return {
      category: categoryMatch ?? undefined,
      district: districtMatch ?? undefined,
      sort: wantsHighestRated
        ? "rating_desc"
        : wantsFastestResponse
          ? "response_time_asc"
          : undefined,
      type: "provider-filters",
      verified: wantsVerified || undefined,
      spokenText,
    };
  }

  if (categoryMatch && districtMatch) {
    return {
      district: districtMatch,
      type: "category-district",
      value: categoryMatch,
      spokenText,
    };
  }

  if (categoryMatch) {
    return {
      type: "category",
      value: categoryMatch,
      spokenText,
    };
  }

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
    "Kadıköy’de tesisat ustası bul",
    "En yüksek puanlı elektrikçileri göster",
    "Doğrulanmış ustaları listele",
    "acil usta çağır",
    "Sarıyer tesisat",
    "profilleri oku",
    "sıfırla",
  ];
}

export function getVoiceCommandCategories() {
  return services.map((service) => service.title);
}
