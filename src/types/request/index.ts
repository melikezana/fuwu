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
  // Emergency request fields
  urgencyType?: string; // 'normal' | 'emergency'
  budgetTag?: string; // 'ekonomik' | 'standart' | 'premium' | 'acil'
  offerAmount?: string;
  offeredPrice?: number;
  paymentPreference?: string; // 'nakit' | 'iban'
  approximateLocation?: string;
  emergencyStatus?: string; // 'pending' | 'accepted' 
};

export type ServiceRequestSubmitResult = {
  confirmationCode?: string | null;
  emergencyStatus?: ServiceRequestEmergencyStatus | null;
  estimatedArrivalText?: string | null;
  notificationMessage?: string | null;
  offeredPrice?: number | null;
  paymentPreference?: ServiceRequestPaymentPreference | null;
  providerCountNotified?: number | null;
  requestCode: string;
  requestId?: string | null;
  urgencyType?: ServiceRequestUrgencyType | null;
};

export type RequestFormInsights = {
  averageResponseMinutesByCategory: Record<string, number>;
  providerCountByCategory: Record<string, number>;
  providerCountByCategoryAndDistrict: Record<string, number>;
  source: "fallback" | "supabase";
};

export type { ServiceRequestStatus } from "@/lib/constants/statuses";

export type ServiceRequestUrgency = "low" | "normal" | "high" | "urgent";

export type ServiceRequestUrgencyType = "standard" | "emergency";

export type ServiceRequestPaymentPreference = "cash" | "iban" | "online_soon";

export type ServiceRequestEmergencyStatus =
  | "pending"
  | "assigned"
  | "accepted"
  | "rejected"
  | "on_the_way"
  | "completed"
  | "cancelled";
