export type ServiceRequestInput = {
  approximateLocation?: string;
  budgetTag?: string;
  serviceCategory: string;
  district: string;
  fullAddress: string;
  offerAmount?: string;
  paymentPreference?: string;
  urgencyLevel: string;
  urgencyType?: string;
  preferredDate: string;
  preferredTimeRange: string;
  fullName: string;
  phoneNumber: string;
  shortDescription: string;
};

export type ServiceRequestSubmitResult = {
  confirmationCode?: string | null;
  estimatedArrivalText?: string | null;
  paymentPreference?: ServiceRequestPaymentPreference | null;
  requestCode: string;
  requestId?: string | null;
  urgencyType?: ServiceRequestUrgencyType;
};

export type { ServiceRequestStatus } from "@/lib/constants/statuses";

export type ServiceRequestUrgency = "low" | "normal" | "high" | "urgent";

export type ServiceRequestUrgencyType = "standard" | "emergency";

export type ServiceRequestPaymentPreference = "cash" | "iban" | "online_soon";
