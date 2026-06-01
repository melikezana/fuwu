import type { ServiceRequestUrgencyType } from "@/types/request";

export type EstimatedArrivalInput = {
  acceptedAt?: Date | string | null;
  district?: string | null;
  urgencyType?: ServiceRequestUrgencyType | string | null;
};

export const liveTrackingSoonText = "Canlı takip yakında";

const centralDistricts = [
  "Ataşehir",
  "Bakırköy",
  "Beşiktaş",
  "Kadıköy",
  "Kağıthane",
  "Şişli",
  "Üsküdar",
];

const outerDistricts = [
  "Adalar",
  "Arnavutköy",
  "Beykoz",
  "Beylikdüzü",
  "Büyükçekmece",
  "Çatalca",
  "Pendik",
  "Silivri",
  "Şile",
  "Tuzla",
];

function normalizeDistrict(value: string | null | undefined) {
  return value?.trim().toLocaleLowerCase("tr") ?? "";
}

function getEmergencyEtaWindow(district: string | null | undefined) {
  const normalizedDistrict = normalizeDistrict(district);

  if (centralDistricts.some((item) => normalizeDistrict(item) === normalizedDistrict)) {
    return "20-35 dk";
  }

  if (outerDistricts.some((item) => normalizeDistrict(item) === normalizedDistrict)) {
    return "35-55 dk";
  }

  return "25-45 dk";
}

export function calculateEstimatedArrivalText({
  district,
  urgencyType,
}: EstimatedArrivalInput = {}) {
  if (urgencyType !== "emergency") {
    return null;
  }

  const normalizedDistrict = district?.trim();
  const etaWindow = getEmergencyEtaWindow(normalizedDistrict);

  if (normalizedDistrict) {
    return `${normalizedDistrict} için tahmini varış: ${etaWindow}`;
  }

  return `Tahmini varış: ${etaWindow}`;
}
