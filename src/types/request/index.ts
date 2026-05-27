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
<<<<<<< HEAD
=======
  confirmationCode?: string | null;
  emergencyStatus?: ServiceRequestEmergencyStatus | null;
  estimatedArrivalText?: string | null;
  notificationMessage?: string | null;
  offeredPrice?: number | null;
  paymentPreference?: ServiceRequestPaymentPreference | null;
>>>>>>> 1ee0e96 (TASK 136 true TAG style emergency flow and design cleanup)
  requestCode: string;
  confirmationCode?: string; // Mutually visible verification code
};

export type { ServiceRequestStatus } from "@/lib/constants/statuses";

export type ServiceRequestUrgency = "low" | "normal" | "high" | "urgent";
<<<<<<< HEAD
=======

export type ServiceRequestUrgencyType = "standard" | "emergency";

export type ServiceRequestPaymentPreference = "cash" | "iban" | "online_soon";

export type ServiceRequestEmergencyStatus =
  | "pending"
  | "accepted"
  | "on_the_way"
  | "completed"
  | "cancelled";
>>>>>>> 1ee0e96 (TASK 136 true TAG style emergency flow and design cleanup)
