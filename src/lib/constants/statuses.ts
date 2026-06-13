export const PROVIDER_APPLICATION_STATUSES = {
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
} as const;

export type ProviderApplicationStatus =
  (typeof PROVIDER_APPLICATION_STATUSES)[keyof typeof PROVIDER_APPLICATION_STATUSES];

export const PROVIDER_APPLICATION_STATUS_VALUES = Object.values(
  PROVIDER_APPLICATION_STATUSES,
) as ProviderApplicationStatus[];

export const PROVIDER_APPLICATION_ALLOWED_TRANSITIONS: Record<
  ProviderApplicationStatus,
  ProviderApplicationStatus[]
> = {
  [PROVIDER_APPLICATION_STATUSES.pending]: [
    PROVIDER_APPLICATION_STATUSES.approved,
    PROVIDER_APPLICATION_STATUSES.rejected,
  ],
  [PROVIDER_APPLICATION_STATUSES.approved]: [],
  [PROVIDER_APPLICATION_STATUSES.rejected]: [],
};

export function isProviderApplicationStatus(
  status: string,
): status is ProviderApplicationStatus {
  return PROVIDER_APPLICATION_STATUS_VALUES.includes(
    status as ProviderApplicationStatus,
  );
}

export function canTransitionProviderApplication(
  fromStatus: string,
  toStatus: string,
) {
  if (!isProviderApplicationStatus(fromStatus) || !isProviderApplicationStatus(toStatus)) {
    return false;
  }

  return PROVIDER_APPLICATION_ALLOWED_TRANSITIONS[fromStatus].includes(toStatus);
}

export const SERVICE_REQUEST_STATUSES = {
  pending: "pending",
  assigned: "assigned",
  accepted: "accepted",
  rejected: "rejected",
  inProgress: "in_progress",
  completed: "completed",
  cancelled: "cancelled",
} as const;

export type ServiceRequestStatus =
  (typeof SERVICE_REQUEST_STATUSES)[keyof typeof SERVICE_REQUEST_STATUSES];

export const SERVICE_REQUEST_STATUS_VALUES = Object.values(
  SERVICE_REQUEST_STATUSES,
) as ServiceRequestStatus[];

export const EMERGENCY_REQUEST_STATUSES = {
  pending: "pending",
  assigned: "assigned",
  accepted: "accepted",
  rejected: "rejected",
  onTheWay: "on_the_way",
  completed: "completed",
  cancelled: "cancelled",
} as const;

export type EmergencyRequestStatus =
  (typeof EMERGENCY_REQUEST_STATUSES)[keyof typeof EMERGENCY_REQUEST_STATUSES];

export const EMERGENCY_REQUEST_STATUS_VALUES = Object.values(
  EMERGENCY_REQUEST_STATUSES,
) as EmergencyRequestStatus[];

export const LEGACY_SERVICE_REQUEST_STATUSES = {
  yeni: "yeni",
  inceleniyor: "inceleniyor",
  ustayaYonlendirildi: "ustaya_yonlendirildi",
  tamamlandi: "tamamlandi",
  iptal: "iptal",
  matched: "matched",
  open: "open",
  onTheWay: "on_the_way",
} as const;

export type LegacyServiceRequestStatus =
  (typeof LEGACY_SERVICE_REQUEST_STATUSES)[keyof typeof LEGACY_SERVICE_REQUEST_STATUSES];

export type ServiceRequestStoredStatus =
  | ServiceRequestStatus
  | LegacyServiceRequestStatus
  | EmergencyRequestStatus;

export const SERVICE_REQUEST_STATUS_LABELS: Record<
  ServiceRequestStoredStatus,
  string
> = {
  [SERVICE_REQUEST_STATUSES.pending]: "Bekliyor",
  [SERVICE_REQUEST_STATUSES.assigned]: "Usta atandı. Yanıt bekleniyor.",
  [SERVICE_REQUEST_STATUSES.accepted]: "Kabul edildi",
  [SERVICE_REQUEST_STATUSES.rejected]: "Reddedildi",
  [SERVICE_REQUEST_STATUSES.inProgress]: "İşlemde",
  [SERVICE_REQUEST_STATUSES.completed]: "Tamamlandı",
  [SERVICE_REQUEST_STATUSES.cancelled]: "İptal edildi",
  [EMERGENCY_REQUEST_STATUSES.onTheWay]: "Yolda",
  [LEGACY_SERVICE_REQUEST_STATUSES.yeni]: "Yeni",
  [LEGACY_SERVICE_REQUEST_STATUSES.inceleniyor]: "İnceleniyor",
  [LEGACY_SERVICE_REQUEST_STATUSES.ustayaYonlendirildi]:
    "Usta atandı. Yanıt bekleniyor.",
  [LEGACY_SERVICE_REQUEST_STATUSES.tamamlandi]: "Tamamlandı",
  [LEGACY_SERVICE_REQUEST_STATUSES.iptal]: "İptal",
  [LEGACY_SERVICE_REQUEST_STATUSES.matched]: "Usta atandı. Yanıt bekleniyor.",
  [LEGACY_SERVICE_REQUEST_STATUSES.open]: "Bekliyor",
};

export const SERVICE_REQUEST_STATUS_DESCRIPTIONS: Record<
  ServiceRequestStoredStatus,
  string
> = {
  [SERVICE_REQUEST_STATUSES.pending]: "Talep uygun usta ataması bekliyor.",
  [SERVICE_REQUEST_STATUSES.assigned]: "Usta atandı. Yanıt bekleniyor.",
  [SERVICE_REQUEST_STATUSES.accepted]: "Usta talebi kabul etti.",
  [SERVICE_REQUEST_STATUSES.rejected]: "Usta talebi reddetti. Yeni eşleşme bekleniyor.",
  [SERVICE_REQUEST_STATUSES.inProgress]: "Talep aktif olarak işlemde.",
  [SERVICE_REQUEST_STATUSES.completed]: "Talep tamamlandı.",
  [SERVICE_REQUEST_STATUSES.cancelled]: "Talep iptal edildi.",
  [EMERGENCY_REQUEST_STATUSES.onTheWay]: "Usta konuma doğru yolda.",
  [LEGACY_SERVICE_REQUEST_STATUSES.yeni]: "Talep yeni alındı ve ilk kontrol bekliyor.",
  [LEGACY_SERVICE_REQUEST_STATUSES.inceleniyor]: "Operasyon ekibi talebi inceliyor.",
  [LEGACY_SERVICE_REQUEST_STATUSES.ustayaYonlendirildi]:
    "Usta atandı. Yanıt bekleniyor.",
  [LEGACY_SERVICE_REQUEST_STATUSES.tamamlandi]: "Talep tamamlandı.",
  [LEGACY_SERVICE_REQUEST_STATUSES.iptal]: "Talep iptal edildi.",
  [LEGACY_SERVICE_REQUEST_STATUSES.matched]: "Usta atandı. Yanıt bekleniyor.",
  [LEGACY_SERVICE_REQUEST_STATUSES.open]: "Talep uygun usta ataması bekliyor.",
};

export const SERVICE_REQUEST_ALLOWED_TRANSITIONS: Record<
  ServiceRequestStatus,
  ServiceRequestStatus[]
> = {
  [SERVICE_REQUEST_STATUSES.pending]: [
    SERVICE_REQUEST_STATUSES.assigned,
    SERVICE_REQUEST_STATUSES.cancelled,
  ],
  [SERVICE_REQUEST_STATUSES.assigned]: [
    SERVICE_REQUEST_STATUSES.accepted,
    SERVICE_REQUEST_STATUSES.rejected,
    SERVICE_REQUEST_STATUSES.cancelled,
  ],
  [SERVICE_REQUEST_STATUSES.accepted]: [
    SERVICE_REQUEST_STATUSES.inProgress,
    SERVICE_REQUEST_STATUSES.completed,
    SERVICE_REQUEST_STATUSES.cancelled,
  ],
  [SERVICE_REQUEST_STATUSES.rejected]: [SERVICE_REQUEST_STATUSES.assigned],
  [SERVICE_REQUEST_STATUSES.inProgress]: [
    SERVICE_REQUEST_STATUSES.completed,
    SERVICE_REQUEST_STATUSES.cancelled,
  ],
  [SERVICE_REQUEST_STATUSES.completed]: [],
  [SERVICE_REQUEST_STATUSES.cancelled]: [],
};

export const EMERGENCY_REQUEST_ALLOWED_TRANSITIONS: Record<
  EmergencyRequestStatus,
  EmergencyRequestStatus[]
> = {
  [EMERGENCY_REQUEST_STATUSES.pending]: [
    EMERGENCY_REQUEST_STATUSES.assigned,
    EMERGENCY_REQUEST_STATUSES.cancelled,
  ],
  [EMERGENCY_REQUEST_STATUSES.assigned]: [
    EMERGENCY_REQUEST_STATUSES.accepted,
    EMERGENCY_REQUEST_STATUSES.rejected,
    EMERGENCY_REQUEST_STATUSES.cancelled,
  ],
  [EMERGENCY_REQUEST_STATUSES.accepted]: [
    EMERGENCY_REQUEST_STATUSES.onTheWay,
    EMERGENCY_REQUEST_STATUSES.completed,
    EMERGENCY_REQUEST_STATUSES.cancelled,
  ],
  [EMERGENCY_REQUEST_STATUSES.rejected]: [EMERGENCY_REQUEST_STATUSES.assigned],
  [EMERGENCY_REQUEST_STATUSES.onTheWay]: [
    EMERGENCY_REQUEST_STATUSES.completed,
    EMERGENCY_REQUEST_STATUSES.cancelled,
  ],
  [EMERGENCY_REQUEST_STATUSES.completed]: [],
  [EMERGENCY_REQUEST_STATUSES.cancelled]: [],
};

export const LEGACY_SERVICE_REQUEST_STATUS_MAP: Record<
  string,
  ServiceRequestStatus
> = {
  [LEGACY_SERVICE_REQUEST_STATUSES.open]: SERVICE_REQUEST_STATUSES.pending,
  [LEGACY_SERVICE_REQUEST_STATUSES.yeni]: SERVICE_REQUEST_STATUSES.pending,
  [LEGACY_SERVICE_REQUEST_STATUSES.inceleniyor]: SERVICE_REQUEST_STATUSES.inProgress,
  [LEGACY_SERVICE_REQUEST_STATUSES.ustayaYonlendirildi]:
    SERVICE_REQUEST_STATUSES.assigned,
  [LEGACY_SERVICE_REQUEST_STATUSES.matched]: SERVICE_REQUEST_STATUSES.assigned,
  [LEGACY_SERVICE_REQUEST_STATUSES.tamamlandi]: SERVICE_REQUEST_STATUSES.completed,
  [LEGACY_SERVICE_REQUEST_STATUSES.iptal]: SERVICE_REQUEST_STATUSES.cancelled,
  [LEGACY_SERVICE_REQUEST_STATUSES.onTheWay]: SERVICE_REQUEST_STATUSES.inProgress,
};

export function isServiceRequestStatus(
  status: string,
): status is ServiceRequestStatus {
  return SERVICE_REQUEST_STATUS_VALUES.includes(status as ServiceRequestStatus);
}

export function isEmergencyRequestStatus(
  status: string,
): status is EmergencyRequestStatus {
  return EMERGENCY_REQUEST_STATUS_VALUES.includes(status as EmergencyRequestStatus);
}

export function normalizeServiceRequestStatus(
  status: string | null | undefined,
): ServiceRequestStatus | null {
  const normalizedStatus = status?.trim() ?? "";

  if (!normalizedStatus) {
    return null;
  }

  if (isServiceRequestStatus(normalizedStatus)) {
    return normalizedStatus;
  }

  return LEGACY_SERVICE_REQUEST_STATUS_MAP[normalizedStatus] ?? null;
}

export function normalizeEmergencyRequestStatus(
  status: string | null | undefined,
): EmergencyRequestStatus | null {
  const normalizedStatus = status?.trim() ?? "";

  if (!normalizedStatus) {
    return null;
  }

  if (isEmergencyRequestStatus(normalizedStatus)) {
    return normalizedStatus;
  }

  const serviceStatus = normalizeServiceRequestStatus(normalizedStatus);

  if (serviceStatus === SERVICE_REQUEST_STATUSES.inProgress) {
    return EMERGENCY_REQUEST_STATUSES.onTheWay;
  }

  return isEmergencyRequestStatus(serviceStatus ?? "") ? serviceStatus : null;
}

export function getAllowedServiceRequestTransitions(status: string) {
  const normalizedStatus = normalizeServiceRequestStatus(status);

  return normalizedStatus
    ? SERVICE_REQUEST_ALLOWED_TRANSITIONS[normalizedStatus]
    : [];
}

export function canTransitionServiceRequest(
  fromStatus: string | null | undefined,
  toStatus: string | null | undefined,
) {
  const from = normalizeServiceRequestStatus(fromStatus);
  const to = normalizeServiceRequestStatus(toStatus);

  if (!from || !to) {
    return false;
  }

  if (from === to) {
    return true;
  }

  return SERVICE_REQUEST_ALLOWED_TRANSITIONS[from].includes(to);
}

export function canTransitionEmergencyRequest(
  fromStatus: string | null | undefined,
  toStatus: string | null | undefined,
) {
  const from = normalizeEmergencyRequestStatus(fromStatus);
  const to = normalizeEmergencyRequestStatus(toStatus);

  if (!from || !to) {
    return false;
  }

  if (from === to) {
    return true;
  }

  return EMERGENCY_REQUEST_ALLOWED_TRANSITIONS[from].includes(to);
}

export const isServiceRequestTransitionAllowed = canTransitionServiceRequest;

export const PROVIDER_AVAILABILITY_STATUSES = {
  musait: "müsait",
  yogun: "yoğun",
  cevrimdisi: "çevrimdışı",
} as const;

export type ProviderAvailabilityStatus =
  (typeof PROVIDER_AVAILABILITY_STATUSES)[keyof typeof PROVIDER_AVAILABILITY_STATUSES];

export const PROVIDER_AVAILABILITY_STATUS_VALUES = Object.values(
  PROVIDER_AVAILABILITY_STATUSES,
) as ProviderAvailabilityStatus[];

export const PROVIDER_AVAILABILITY_STATUS_LABELS: Record<
  ProviderAvailabilityStatus,
  string
> = {
  [PROVIDER_AVAILABILITY_STATUSES.musait]: "Müsait",
  [PROVIDER_AVAILABILITY_STATUSES.yogun]: "Yoğun",
  [PROVIDER_AVAILABILITY_STATUSES.cevrimdisi]: "Çevrimdışı",
};

export function isProviderAvailabilityStatus(
  status: string,
): status is ProviderAvailabilityStatus {
  return PROVIDER_AVAILABILITY_STATUS_VALUES.includes(
    status as ProviderAvailabilityStatus,
  );
}

export function normalizeProviderAvailabilityStatus(
  status: string | null | undefined,
): ProviderAvailabilityStatus {
  const normalizedStatus = status?.trim().toLocaleLowerCase("tr") ?? "";

  if (isProviderAvailabilityStatus(normalizedStatus)) {
    return normalizedStatus;
  }

  return PROVIDER_AVAILABILITY_STATUSES.musait;
}
