import type { ServiceRequestUrgencyType } from "@/types/request";

export type EstimatedArrivalInput = {
  acceptedAt?: Date | string | null;
  district?: string | null;
  urgencyType?: ServiceRequestUrgencyType | string | null;
};

export const liveTrackingSoonText = "Canlı takip yakında";

export function calculateEstimatedArrivalText({
  acceptedAt,
  district,
  urgencyType,
}: EstimatedArrivalInput = {}) {
  if (urgencyType !== "emergency") {
    return null;
  }

  if (!acceptedAt) {
    return "Usta kabul edince tahmini varış süresi paylaşılacak";
  }

  const normalizedDistrict = district?.trim();

  if (normalizedDistrict) {
    return `${normalizedDistrict} için tahmini varış: 25-40 dk`;
  }

  return "Tahmini varış: 25-40 dk";
}
