import type { ServiceRequestUrgencyType } from "@/types/request";
export type EstimatedArrivalInput = { acceptedAt?: Date | string | null; district?: string | null; urgencyType?: ServiceRequestUrgencyType | string | null };
export const liveTrackingSoonText = "Canlı konum paylaşımı yok. Varış saatini ustanla teyit et.";
// Preserve callers without inventing a route/travel-time estimate from a district name.
export function calculateEstimatedArrivalText(input: EstimatedArrivalInput = {}): string | null {
 void input;
 return null;
}
