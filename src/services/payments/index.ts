import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { isUuid } from "@/lib/utils/validation";
import type { ServiceRequestPaymentPreference } from "@/types/request";

export type { ServiceRequestPaymentPreference } from "@/types/request";

type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];
type PaymentInsert = Database["public"]["Tables"]["payments"]["Insert"];
type PaymentUpdate = Database["public"]["Tables"]["payments"]["Update"];
type PaymentSupabaseClient = SupabaseClient<Database>;

export type PaymentStatus = PaymentRow["status"];

export type PaymentTrackingRecord = {
  amount: number | null;
  confirmedAt: string | null;
  id: string;
  paymentMethod: ServiceRequestPaymentPreference;
  requestId: string;
  status: PaymentStatus;
};

export const PAYMENT_PREFERENCES = {
  cash: "cash",
  iban: "iban",
  onlineSoon: "online_soon",
} as const satisfies Record<string, ServiceRequestPaymentPreference>;

export const EMERGENCY_PAYMENT_PREFERENCES = [
  PAYMENT_PREFERENCES.cash,
  PAYMENT_PREFERENCES.iban,
] as const;

export const PAYMENT_STATUSES = {
  confirmed: "confirmed",
  pendingConfirmation: "pending_confirmation",
} as const satisfies Record<string, PaymentStatus>;

export const PAYMENT_PREFERENCE_LABELS: Record<ServiceRequestPaymentPreference, string> = {
  [PAYMENT_PREFERENCES.cash]: "Nakit",
  [PAYMENT_PREFERENCES.iban]: "IBAN / Havale",
  [PAYMENT_PREFERENCES.onlineSoon]: "Online Ödeme - Yakında",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  [PAYMENT_STATUSES.confirmed]: "Onaylandı",
  [PAYMENT_STATUSES.pendingConfirmation]: "Onay bekliyor",
};

export const ibanAfterProviderAcceptsText =
  "IBAN bilgisi usta kabul ettikten sonra paylaşılır.";

export function normalizePaymentPreference(
  value: string | null | undefined,
): ServiceRequestPaymentPreference | null {
  const normalizedValue = value?.trim().toLocaleLowerCase("tr").replace(/\s+/g, "-") ?? "";

  if (!normalizedValue) {
    return null;
  }

  if (["cash", "nakit"].includes(normalizedValue)) {
    return PAYMENT_PREFERENCES.cash;
  }

  if (["iban", "havale", "iban-ile-odeme", "iban-ile-ödeme"].includes(normalizedValue)) {
    return PAYMENT_PREFERENCES.iban;
  }

  if (
    [
      "online",
      "online-soon",
      "online_soon",
      "online-odeme-yakinda",
      "online-ödeme-yakında",
    ].includes(normalizedValue)
  ) {
    return PAYMENT_PREFERENCES.onlineSoon;
  }

  return null;
}

export function getPaymentPreferenceLabel(value: string | null | undefined) {
  const paymentPreference = normalizePaymentPreference(value);

  return paymentPreference ? PAYMENT_PREFERENCE_LABELS[paymentPreference] : "Belirtilmedi";
}

export function savePaymentPreference(value: string | null | undefined) {
  return normalizePaymentPreference(value);
}

export function getPaymentStatusLabel(value: string | null | undefined) {
  return value === PAYMENT_STATUSES.confirmed
    ? PAYMENT_STATUS_LABELS[PAYMENT_STATUSES.confirmed]
    : value === PAYMENT_STATUSES.pendingConfirmation
      ? PAYMENT_STATUS_LABELS[PAYMENT_STATUSES.pendingConfirmation]
      : "Takip kaydı yok";
}

export function isEmergencyPaymentPreference(
  value: string | null | undefined,
): value is (typeof EMERGENCY_PAYMENT_PREFERENCES)[number] {
  const paymentPreference = normalizePaymentPreference(value);

  return paymentPreference === PAYMENT_PREFERENCES.cash || paymentPreference === PAYMENT_PREFERENCES.iban;
}

export function saveEmergencyPaymentPreference(value: string | null | undefined) {
  const paymentPreference = normalizePaymentPreference(value);

  return isEmergencyPaymentPreference(paymentPreference) ? paymentPreference : null;
}

function isMissingPaymentsTable(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as {
    code?: unknown;
    details?: unknown;
    hint?: unknown;
    message?: unknown;
  };
  const errorText = [record.code, record.details, record.hint, record.message]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLocaleLowerCase("tr");

  return (
    errorText.includes("payments") &&
    (errorText.includes("does not exist") ||
      errorText.includes("could not find") ||
      errorText.includes("pgrst205") ||
      errorText.includes("42p01"))
  );
}

function warnPaymentTrackingError(context: string, error: unknown) {
  if (isMissingPaymentsTable(error)) {
    console.warn("[Fuwu] Payment tracking skipped because payments table is missing.", {
      context,
    });
    return;
  }

  console.warn("[Fuwu] Payment tracking failed.", {
    context,
    error,
  });
}

function mapPaymentRecord(record: PaymentRow): PaymentTrackingRecord {
  return {
    amount:
      typeof record.amount === "number"
        ? record.amount
        : record.amount === null
          ? null
          : Number(record.amount),
    confirmedAt: record.confirmed_at,
    id: record.id,
    paymentMethod: record.payment_method,
    requestId: record.request_id,
    status: record.status,
  };
}

export async function getPaymentRecordsByRequestIds(
  supabase: PaymentSupabaseClient,
  requestIds: string[],
) {
  const uniqueRequestIds = Array.from(new Set(requestIds.filter(isUuid)));

  if (uniqueRequestIds.length === 0) {
    return new Map<string, PaymentTrackingRecord>();
  }

  const { data, error } = await supabase
    .from("payments")
    .select("id, request_id, amount, payment_method, status, confirmed_at")
    .in("request_id", uniqueRequestIds);

  if (error) {
    warnPaymentTrackingError("payment records read", error);
    return new Map<string, PaymentTrackingRecord>();
  }

  return new Map(
    ((data ?? []) as PaymentRow[]).map((payment) => [
      payment.request_id,
      mapPaymentRecord(payment),
    ]),
  );
}

async function getExistingPaymentForRequest(
  supabase: PaymentSupabaseClient,
  requestId: string,
) {
  const { data, error } = await supabase
    .from("payments")
    .select("id, request_id, amount, payment_method, status, confirmed_at")
    .eq("request_id", requestId)
    .maybeSingle();

  if (error) {
    warnPaymentTrackingError("payment record lookup", error);
    return null;
  }

  return data ? mapPaymentRecord(data as PaymentRow) : null;
}

export async function createPaymentTrackingForCompletedRequest({
  actorUserId,
  requestId,
  supabase,
}: {
  actorUserId: string | null;
  requestId: string;
  supabase: PaymentSupabaseClient;
}) {
  if (!isUuid(requestId)) {
    return false;
  }

  const { data: request, error: requestError } = await supabase
    .from("service_requests")
    .select("id, offered_price, payment_preference, status")
    .eq("id", requestId)
    .maybeSingle();

  if (requestError) {
    warnPaymentTrackingError("completed request lookup", requestError);
    return false;
  }

  if (!request || request.status !== "completed") {
    return false;
  }

  const existingPayment = await getExistingPaymentForRequest(supabase, requestId);

  if (existingPayment?.status === PAYMENT_STATUSES.confirmed) {
    return true;
  }

  const amount =
    typeof request.offered_price === "number"
      ? request.offered_price
      : request.offered_price === null
        ? null
        : Number(request.offered_price);
  const paymentMethod =
    savePaymentPreference(request.payment_preference) ?? PAYMENT_PREFERENCES.cash;

  if (existingPayment) {
    const updatePayload: PaymentUpdate = {
      amount: Number.isFinite(amount) ? amount : null,
      payment_method: paymentMethod,
      status: PAYMENT_STATUSES.pendingConfirmation,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("payments")
      .update(updatePayload)
      .eq("id", existingPayment.id);

    if (error) {
      warnPaymentTrackingError("payment record update", error);
      return false;
    }

    return true;
  }

  const insertPayload: PaymentInsert = {
    amount: Number.isFinite(amount) ? amount : null,
    payment_method: paymentMethod,
    request_id: requestId,
    status: PAYMENT_STATUSES.pendingConfirmation,
  };
  const { error } = await supabase.from("payments").insert(insertPayload);

  if (error) {
    warnPaymentTrackingError("payment record insert", error);
    return false;
  }

  console.info("[Fuwu] Payment tracking record created.", {
    actorUserId,
    paymentMethod,
    requestId,
  });

  return true;
}

export async function confirmTrackedPaymentForRequest({
  actorUserId,
  requestId,
  supabase,
}: {
  actorUserId: string;
  requestId: string;
  supabase: PaymentSupabaseClient;
}) {
  if (!isUuid(requestId)) {
    return false;
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("payments")
    .update({
      confirmed_at: now,
      confirmed_by: actorUserId,
      status: PAYMENT_STATUSES.confirmed,
      updated_at: now,
    })
    .eq("request_id", requestId)
    .select("id")
    .maybeSingle();

  if (error) {
    warnPaymentTrackingError("payment confirmation update", error);
    return false;
  }

  return Boolean(data?.id);
}
