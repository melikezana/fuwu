export type ProviderTrustBadgeTone = "green" | "orange";

export type ProviderTrustBadge = {
  id: "fuwu-approved" | "identity-verified" | "phone-verified" | "active-24h";
  label: string;
  tone: ProviderTrustBadgeTone;
};

export type ProviderOperationalStatus = {
  label: "Müsait" | "Şu anda çevrimdışı" | "Yakında müsait";
  tone: "green" | "neutral" | "orange";
};

export type ProviderProfileCompletionInput = {
  availability?: string | null;
  category?: string | null;
  description?: string | null;
  district?: string | null;
  phone?: string | null;
  profileImageUrl?: string | null;
  servicesOffered?: string[] | null;
  workingHours?: string | null;
};

export type ProviderProfileCompletion = {
  missingFields: string[];
  score: number;
};

export const providerWorkingHourOptions = ["09:00-18:00", "09:00-22:00", "7/24"] as const;

export type ProviderWorkingHours = (typeof providerWorkingHourOptions)[number];

const profileCompletionFields: Array<{
  isComplete: (input: ProviderProfileCompletionInput) => boolean;
  label: string;
}> = [
  {
    isComplete: (input) => Boolean(input.profileImageUrl?.trim()),
    label: "Profil fotoğrafı",
  },
  {
    isComplete: (input) => Boolean(input.phone?.trim()),
    label: "Telefon",
  },
  {
    isComplete: (input) => Boolean(input.district?.trim()),
    label: "İlçe",
  },
  {
    isComplete: (input) =>
      Boolean(input.category?.trim()) ||
      Boolean(input.servicesOffered?.some((service) => service.trim())),
    label: "Hizmetler",
  },
  {
    isComplete: (input) => Boolean(input.description?.trim()),
    label: "Açıklama",
  },
  {
    isComplete: (input) =>
      Boolean(input.availability?.trim()) && Boolean(input.workingHours?.trim()),
    label: "Uygunluk",
  },
];

function normalizeWorkingHours(value: string | null | undefined): ProviderWorkingHours {
  const normalizedValue = (value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[–—]/g, "-");

  if (providerWorkingHourOptions.includes(normalizedValue as ProviderWorkingHours)) {
    return normalizedValue as ProviderWorkingHours;
  }

  return "09:00-18:00";
}

function parseTimeMinutes(value: string) {
  const match = value.match(/^(\d{2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return null;
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

function getIstanbulMinutes(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");

  return hour * 60 + minute;
}

function isLastActiveWithinHours(value: string | null | undefined, hours: number) {
  if (!value) {
    return false;
  }

  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  const diff = Date.now() - timestamp;

  return diff >= 0 && diff <= hours * 60 * 60 * 1000;
}

export function formatProviderWorkingHours(value: string | null | undefined) {
  const workingHours = normalizeWorkingHours(value);

  if (workingHours === "7/24") {
    return "7/24";
  }

  return workingHours.replace("-", "–");
}

export function getProviderOperationalStatus({
  availability,
  now = new Date(),
  workingHours,
}: {
  availability?: string | null;
  now?: Date;
  workingHours?: string | null;
}): ProviderOperationalStatus {
  const normalizedAvailability = availability?.trim().toLocaleLowerCase("tr") ?? "";

  if (normalizedAvailability === "çevrimdışı") {
    return {
      label: "Şu anda çevrimdışı",
      tone: "neutral",
    };
  }

  const normalizedWorkingHours = normalizeWorkingHours(workingHours);

  if (normalizedWorkingHours === "7/24") {
    return normalizedAvailability === "yoğun"
      ? {
          label: "Yakında müsait",
          tone: "orange",
        }
      : {
          label: "Müsait",
          tone: "green",
        };
  }

  const [startsAt, endsAt] = normalizedWorkingHours.split("-");
  const startMinutes = parseTimeMinutes(startsAt);
  const endMinutes = parseTimeMinutes(endsAt);

  if (startMinutes === null || endMinutes === null) {
    return {
      label: "Şu anda çevrimdışı",
      tone: "neutral",
    };
  }

  const currentMinutes = getIstanbulMinutes(now);

  if (currentMinutes < startMinutes) {
    return {
      label: "Yakında müsait",
      tone: "orange",
    };
  }

  if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
    return normalizedAvailability === "yoğun"
      ? {
          label: "Yakında müsait",
          tone: "orange",
        }
      : {
          label: "Müsait",
          tone: "green",
        };
  }

  return {
    label: "Şu anda çevrimdışı",
    tone: "neutral",
  };
}

export function getProviderTrustBadges({
  identityVerified,
  isVerified,
  lastActiveAt,
  phoneVerified,
}: {
  identityVerified?: boolean | null;
  isVerified?: boolean | null;
  lastActiveAt?: string | null;
  phoneVerified?: boolean | null;
}): ProviderTrustBadge[] {
  const badges: ProviderTrustBadge[] = [];

  if (isVerified) {
    badges.push({
      id: "fuwu-approved",
      label: "Fuwu Onaylı",
      tone: "green",
    });
  }

  if (identityVerified) {
    badges.push({
      id: "identity-verified",
      label: "Kimlik Doğrulandı",
      tone: "green",
    });
  }

  if (phoneVerified) {
    badges.push({
      id: "phone-verified",
      label: "Telefon Doğrulandı",
      tone: "orange",
    });
  }

  if (isLastActiveWithinHours(lastActiveAt, 24)) {
    badges.push({
      id: "active-24h",
      label: "Son 24 Saatte Aktif",
      tone: "green",
    });
  }

  return badges;
}

export function formatProviderResponseTime(minutes: number | null | undefined) {
  if (typeof minutes !== "number" || !Number.isFinite(minutes) || minutes <= 0) {
    return "Yeni Usta";
  }

  return `Ortalama cevap: ${Math.round(minutes)} dk`;
}

export function calculateProviderProfileCompletion(
  input: ProviderProfileCompletionInput,
): ProviderProfileCompletion {
  const missingFields = profileCompletionFields
    .filter((field) => !field.isComplete(input))
    .map((field) => field.label);
  const completedCount = profileCompletionFields.length - missingFields.length;

  return {
    missingFields,
    score: Math.round((completedCount / profileCompletionFields.length) * 100),
  };
}
