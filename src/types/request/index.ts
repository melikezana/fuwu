export type ServiceRequestInput = {
  serviceCategory: string;
  district: string;
  fullAddress: string;
  urgencyLevel: string;
  preferredDate: string;
  preferredTimeRange: string;
  fullName: string;
  phoneNumber: string;
  shortDescription: string;
};

export type ServiceRequestSubmitResult = {
  requestCode: string;
};

export type { ServiceRequestStatus } from "@/lib/constants/statuses";

export type ServiceRequestUrgency = "low" | "normal" | "high" | "urgent";
