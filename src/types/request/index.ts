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
  // TAG-style Emergency Fields
  urgencyType?: string; // 'normal' | 'emergency'
  budgetTag?: string; // 'ekonomik' | 'standart' | 'premium' | 'acil'
  offeredPrice?: number;
  paymentPreference?: string; // 'nakit' | 'iban'
  approximateLocation?: string;
  emergencyStatus?: string; // 'pending' | 'accepted' 
};

export type ServiceRequestSubmitResult = {
  requestCode: string;
  confirmationCode?: string; // Mutually visible verification code
  urgencyType?: string;
  paymentPreference?: string;
  estimatedArrivalText?: string;
  offeredPrice?: number;
  requestId?: string | null;
};

export type { ServiceRequestStatus } from "@/lib/constants/statuses";

export type ServiceRequestUrgency = "low" | "normal" | "high" | "urgent";
export type ServiceRequestPaymentPreference = "cash" | "iban" | "online_soon";
export type ServiceRequestUrgencyType = "standard" | "emergency";
