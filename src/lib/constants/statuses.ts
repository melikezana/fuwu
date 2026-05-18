export const SERVICE_REQUEST_STATUSES = {
  yeni: "yeni",
  inceleniyor: "inceleniyor",
  ustayaYonlendirildi: "ustaya_yonlendirildi",
  tamamlandi: "tamamlandi",
  iptal: "iptal",
} as const;

export type ServiceRequestStatus =
  (typeof SERVICE_REQUEST_STATUSES)[keyof typeof SERVICE_REQUEST_STATUSES];

export const SERVICE_REQUEST_STATUS_VALUES = Object.values(
  SERVICE_REQUEST_STATUSES,
) as ServiceRequestStatus[];

export const SERVICE_REQUEST_STATUS_LABELS: Record<ServiceRequestStatus, string> = {
  [SERVICE_REQUEST_STATUSES.yeni]: "Yeni",
  [SERVICE_REQUEST_STATUSES.inceleniyor]: "İnceleniyor",
  [SERVICE_REQUEST_STATUSES.ustayaYonlendirildi]: "Ustaya Yönlendirildi",
  [SERVICE_REQUEST_STATUSES.tamamlandi]: "Tamamlandı",
  [SERVICE_REQUEST_STATUSES.iptal]: "İptal",
};

export const LEGACY_SERVICE_REQUEST_STATUS_MAP: Record<string, ServiceRequestStatus> = {
  cancelled: SERVICE_REQUEST_STATUSES.iptal,
  completed: SERVICE_REQUEST_STATUSES.tamamlandi,
  in_progress: SERVICE_REQUEST_STATUSES.inceleniyor,
  matched: SERVICE_REQUEST_STATUSES.ustayaYonlendirildi,
  open: SERVICE_REQUEST_STATUSES.yeni,
};

export function isServiceRequestStatus(
  status: string,
): status is ServiceRequestStatus {
  return SERVICE_REQUEST_STATUS_VALUES.includes(status as ServiceRequestStatus);
}

export function normalizeServiceRequestStatus(
  status: string,
): ServiceRequestStatus | null {
  const normalizedStatus = status.trim();

  if (isServiceRequestStatus(normalizedStatus)) {
    return normalizedStatus;
  }

  return LEGACY_SERVICE_REQUEST_STATUS_MAP[normalizedStatus] ?? null;
}

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

export function isProviderApplicationStatus(
  status: string,
): status is ProviderApplicationStatus {
  return PROVIDER_APPLICATION_STATUS_VALUES.includes(
    status as ProviderApplicationStatus,
  );
}
