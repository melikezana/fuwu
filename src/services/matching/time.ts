import {
  instantMatchTimeOptions,
  type InstantMatchTimeValue,
} from "@/lib/constants/instantMatch";
import { normalizeServiceValue } from "@/lib/constants/services";

export type TimePreferenceRequestIntent = {
  label: string;
  preferredDateOffsetDays: number | null;
  requestNote: string;
  urgencyLevel: "Acil" | "Bu hafta" | "Esnek" | "";
  value?: InstantMatchTimeValue;
};

export type { InstantMatchTimeValue };

export function normalizeTimePreference(
  value: string | undefined,
): InstantMatchTimeValue | undefined {
  const normalizedValue = normalizeServiceValue(value ?? "");

  if (!normalizedValue) {
    return undefined;
  }

  if (["bugun", "today", "acil"].includes(normalizedValue)) {
    return "bugun";
  }

  if (["yarin", "tomorrow"].includes(normalizedValue)) {
    return "yarin";
  }

  if (["bu hafta", "hafta", "week", "this week"].includes(normalizedValue)) {
    return "bu-hafta";
  }

  if (["esnek", "flexible"].includes(normalizedValue)) {
    return "esnek";
  }

  const matchingOption = instantMatchTimeOptions.find(
    (option) =>
      normalizeServiceValue(option.value) === normalizedValue ||
      normalizeServiceValue(option.label) === normalizedValue,
  );

  return matchingOption?.value;
}

export function getTimePreferenceLabel(value: string | undefined) {
  const timePreference = normalizeTimePreference(value);

  return instantMatchTimeOptions.find((option) => option.value === timePreference)?.label ?? "";
}

export function mapTimePreferenceToRequestIntent(
  value: string | undefined,
): TimePreferenceRequestIntent {
  const timePreference = normalizeTimePreference(value);
  const label = getTimePreferenceLabel(timePreference);

  if (timePreference === "bugun") {
    return {
      label,
      preferredDateOffsetDays: 0,
      requestNote: "Zaman tercihi: Bugün",
      urgencyLevel: "Acil",
      value: timePreference,
    };
  }

  if (timePreference === "yarin") {
    return {
      label,
      preferredDateOffsetDays: 1,
      requestNote: "Zaman tercihi: Yarın",
      urgencyLevel: "Bu hafta",
      value: timePreference,
    };
  }

  if (timePreference === "bu-hafta") {
    return {
      label,
      preferredDateOffsetDays: null,
      requestNote: "Zaman tercihi: Bu hafta",
      urgencyLevel: "Bu hafta",
      value: timePreference,
    };
  }

  if (timePreference === "esnek") {
    return {
      label,
      preferredDateOffsetDays: null,
      requestNote: "Zaman tercihi: Esnek",
      urgencyLevel: "Esnek",
      value: timePreference,
    };
  }

  return {
    label: "",
    preferredDateOffsetDays: null,
    requestNote: "",
    urgencyLevel: "",
  };
}
