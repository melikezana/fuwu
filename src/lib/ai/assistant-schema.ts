export const assistantCategories = [
  "electric",
  "plumbing",
  "cleaning",
  "white_goods",
  "locksmith",
  "painting",
  "furniture",
  "moving",
  "carpet_cleaning",
  "pool_garden",
  "renovation",
  "unknown",
] as const;

export const assistantUrgencies = ["low", "medium", "high", "emergency"] as const;

export type AssistantCategory = (typeof assistantCategories)[number];
export type AssistantUrgency = (typeof assistantUrgencies)[number];

export type AssistantAnalysis = {
  summary: string;
  likelyIssue: string;
  category: AssistantCategory;
  urgency: AssistantUrgency;
  confidence: number;
  safeFirstSteps: string[];
  avoidDoing: string[];
  professionalNeeded: boolean;
  emergencyMessage: string | null;
  followUpQuestions: string[];
  providerSearchRecommended: boolean;
};

export type RecommendedProvider = {
  id: string;
  name: string;
  category: string;
  district: string;
  rating: number | null;
  reviewCount: number | null;
  verified: boolean;
  availability: string | null;
  responseTime: string | null;
  startingPrice: string | null;
  distanceKm: number | null;
  profileImageUrl: string | null;
  profileHref: string;
  bookingHref: string;
};

export type AssistantAnalyzeResponse = {
  analysis: AssistantAnalysis;
  cached: boolean;
  conversationId: string | null;
  imageReference: string | null;
  providers: RecommendedProvider[];
};

export const assistantAnalysisJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "summary",
    "likelyIssue",
    "category",
    "urgency",
    "confidence",
    "safeFirstSteps",
    "avoidDoing",
    "professionalNeeded",
    "emergencyMessage",
    "followUpQuestions",
    "providerSearchRecommended",
  ],
  properties: {
    summary: {
      type: "string",
      maxLength: 900,
    },
    likelyIssue: {
      type: "string",
      maxLength: 220,
    },
    category: {
      type: "string",
      enum: assistantCategories,
    },
    urgency: {
      type: "string",
      enum: assistantUrgencies,
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
    },
    safeFirstSteps: {
      type: "array",
      maxItems: 5,
      items: {
        type: "string",
        maxLength: 180,
      },
    },
    avoidDoing: {
      type: "array",
      maxItems: 5,
      items: {
        type: "string",
        maxLength: 180,
      },
    },
    professionalNeeded: {
      type: "boolean",
    },
    emergencyMessage: {
      type: ["string", "null"],
      maxLength: 360,
    },
    followUpQuestions: {
      type: "array",
      maxItems: 3,
      items: {
        type: "string",
        maxLength: 160,
      },
    },
    providerSearchRecommended: {
      type: "boolean",
    },
  },
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAssistantCategory(value: unknown): value is AssistantCategory {
  return assistantCategories.includes(value as AssistantCategory);
}

function isAssistantUrgency(value: unknown): value is AssistantUrgency {
  return assistantUrgencies.includes(value as AssistantUrgency);
}

function normalizeText(value: unknown, maxLength: number) {
  return typeof value === "string"
    ? value.replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, maxLength)
    : "";
}

function normalizeTextList(value: unknown, maxItems: number, maxLength: number) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeText(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeConfidence(value: unknown) {
  const confidence = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(confidence)) {
    return 0;
  }

  return Math.min(1, Math.max(0, confidence));
}

export function parseAssistantAnalysis(value: unknown): AssistantAnalysis | null {
  if (!isRecord(value)) {
    return null;
  }

  const summary = normalizeText(value.summary, 900);
  const likelyIssue = normalizeText(value.likelyIssue, 220);
  const category = value.category;
  const urgency = value.urgency;

  if (!summary || !likelyIssue || !isAssistantCategory(category) || !isAssistantUrgency(urgency)) {
    return null;
  }

  return {
    summary,
    likelyIssue,
    category,
    urgency,
    confidence: normalizeConfidence(value.confidence),
    safeFirstSteps: normalizeTextList(value.safeFirstSteps, 5, 180),
    avoidDoing: normalizeTextList(value.avoidDoing, 5, 180),
    professionalNeeded: Boolean(value.professionalNeeded),
    emergencyMessage:
      value.emergencyMessage === null ? null : normalizeText(value.emergencyMessage, 360) || null,
    followUpQuestions: normalizeTextList(value.followUpQuestions, 3, 160),
    providerSearchRecommended: Boolean(value.providerSearchRecommended),
  };
}

