import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { isUuid } from "@/lib/utils/validation";
import { AppError, AuthError, handleServiceError, ValidationError } from "@/lib/errors";
import { writeAuditLog } from "@/services/audit";
import {
  generateUniqueCustomerVerificationCode,
  normalizeCustomerVerificationCode,
} from "@/services/requests/verificationCode";
import {
  PAYMENT_PREFERENCES,
  PAYMENT_STATUSES,
  savePaymentPreference,
  type PaymentStatus,
  type ServiceRequestPaymentPreference,
} from "./constants";

export {
  EMERGENCY_PAYMENT_PREFERENCES,
  PAYMENT_PREFERENCE_LABELS,
  PAYMENT_PREFERENCES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUSES,
  getPaymentPreferenceLabel,
  getPaymentStatusLabel,
  ibanAfterProviderAcceptsText,
  isEmergencyPaymentPreference,
  normalizePaymentPreference,
  saveEmergencyPaymentPreference,
  savePaymentPreference,
} from "./constants";
export type { PaymentStatus, ServiceRequestPaymentPreference } from "./constants";

type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];
type PaymentInsert = Database["public"]["Tables"]["payments"]["Insert"];
type PaymentUpdate = Database["public"]["Tables"]["payments"]["Update"];
type PaymentSupabaseClient = SupabaseClient<Database>;
type PaymentReleaseRecord = Pick<
  PaymentRow,
  | "amount"
  | "confirmed_at"
  | "id"
  | "iyzico_conversation_id"
  | "iyzico_payment_transaction_id"
  | "payment_method"
  | "request_id"
  | "status"
>;
const processedIyzicoPaymentStatuses = new Set<string>([
  PAYMENT_STATUSES.escrowHeld,
  PAYMENT_STATUSES.escrowReleased,
  PAYMENT_STATUSES.escrowRefunded,
]);

export type PaymentTrackingRecord = {
  amount: number | null;
  confirmedAt: string | null;
  id: string;
  paymentMethod: ServiceRequestPaymentPreference;
  requestId: string;
  status: PaymentStatus;
};

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
    .select("id, confirmation_code, offered_price, payment_preference, status")
    .eq("id", requestId)
    .maybeSingle();

  if (requestError) {
    warnPaymentTrackingError("completed request lookup", requestError);
    return false;
  }

  if (!request || request.status !== "completed") {
    return false;
  }

  const currentVerificationCode = normalizeCustomerVerificationCode(
    request.confirmation_code,
  );

  if (
    currentVerificationCode.length !== 6 ||
    currentVerificationCode !== request.confirmation_code
  ) {
    const confirmationCode = await generateUniqueCustomerVerificationCode(supabase);
    const { error } = await supabase
      .from("service_requests")
      .update({
        confirmation_code: confirmationCode,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (error) {
      warnPaymentTrackingError("verification code backfill", error);
      return false;
    }
  }

  const existingPayment = await getExistingPaymentForRequest(supabase, requestId);

  if (existingPayment?.status === PAYMENT_STATUSES.confirmed) {
    return true;
  }

  if (
    existingPayment?.paymentMethod === PAYMENT_PREFERENCES.iyzico &&
    processedIyzicoPaymentStatuses.has(existingPayment.status)
  ) {
    return true;
  }

  const amount =
    typeof request.offered_price === "number"
      ? request.offered_price
      : request.offered_price === null
        ? null
        : Number(request.offered_price);
  const paymentMethod =
    savePaymentPreference(request.payment_preference) ?? PAYMENT_PREFERENCES.onlineSoon;

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

async function getPaymentPrivilegedClient(fallbackClient: PaymentSupabaseClient) {
  const { createSupabaseServiceRoleClient } = await import(
    "@/lib/supabase/serviceRole"
  );

  return createSupabaseServiceRoleClient() ?? fallbackClient;
}

async function getPaymentForCustomerConfirmation(
  supabase: PaymentSupabaseClient,
  requestId: string,
) {
  const { data, error } = await supabase
    .from("payments")
    .select(
      "id, request_id, amount, payment_method, status, confirmed_at, iyzico_conversation_id, iyzico_payment_transaction_id",
    )
    .eq("request_id", requestId)
    .maybeSingle();

  if (error) {
    throw handleServiceError(error, {
      logContext: "Customer payment lookup failed.",
      publicMessage: "Ödeme kaydı şu anda kontrol edilemedi.",
      tableName: "payments",
    });
  }

  return data as PaymentReleaseRecord | null;
}

async function notifyAdminsAboutEscrowFailure({
  actorUserId,
  errorMessage,
  paymentId,
  requestId,
  supabase,
}: {
  actorUserId: string;
  errorMessage: string;
  paymentId: string;
  requestId: string;
  supabase: PaymentSupabaseClient;
}) {
  const { data: admins, error: adminError } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .limit(100);

  if (adminError || !admins?.length) {
    return false;
  }

  const notificationRows = admins.map((admin) => ({
    actor_user_id: actorUserId,
    body:
      "iyzico escrow release başarısız oldu. Ödeme manuel kontrol ve acil müdahale bekliyor.",
    entity_id: requestId,
    entity_type: "service_request" as const,
    event: "payment_escrow_failed",
    is_read: false,
    message:
      "iyzico escrow release başarısız oldu. Ödeme manuel kontrol ve acil müdahale bekliyor.",
    metadata: {
      errorMessage,
      paymentId,
      requestId,
    },
    provider_id: null,
    recipient_user_id: admin.id,
    request_id: requestId,
    title: "Acil: iyzico payout başarısız",
    type: "payment_escrow_failed",
    user_id: admin.id,
  }));

  const { error } = await supabase
    .from("notifications")
    .upsert(notificationRows, {
      onConflict: "recipient_user_id,request_id,event",
    });

  return !error;
}

async function markIyzicoEscrowFailed({
  actorUserId,
  error,
  payment,
  supabase,
}: {
  actorUserId: string;
  error: unknown;
  payment: PaymentReleaseRecord;
  supabase: PaymentSupabaseClient;
}) {
  const errorMessage =
    error instanceof Error ? error.message : "iyzico escrow release failed.";
  const now = new Date().toISOString();

  await supabase
    .from("payments")
    .update({
      escrow_failed_at: now,
      status: PAYMENT_STATUSES.escrowFailed,
      updated_at: now,
    })
    .eq("id", payment.id);

  await Promise.all([
    notifyAdminsAboutEscrowFailure({
      actorUserId,
      errorMessage,
      paymentId: payment.id,
      requestId: payment.request_id,
      supabase,
    }),
    writeAuditLog(
      {
        action: "payment.escrow_release_failed",
        actorUserId,
        entityId: payment.id,
        entityType: "payment",
        metadata: {
          errorMessage,
          requestId: payment.request_id,
        },
      },
      supabase,
    ),
  ]);
}

async function releaseIyzicoEscrowPayment({
  actorUserId,
  payment,
  supabase,
}: {
  actorUserId: string;
  payment: PaymentReleaseRecord;
  supabase: PaymentSupabaseClient;
}) {
  if (payment.status === PAYMENT_STATUSES.escrowReleased) {
    return mapPaymentRecord(payment as PaymentRow);
  }

  if (payment.status !== PAYMENT_STATUSES.escrowHeld) {
    throw new AppError("payment-escrow-not-held", {
      code: "payment-escrow-not-held",
      publicMessage: "Ödeme henüz iyzico emanet hesabında görünmüyor.",
      statusCode: 409,
    });
  }

  if (!payment.iyzico_conversation_id || !payment.iyzico_payment_transaction_id) {
    await markIyzicoEscrowFailed({
      actorUserId,
      error: new Error("Missing iyzico payment transaction id for escrow release."),
      payment,
      supabase,
    });

    throw new AppError("payment-escrow-release-missing-transaction", {
      code: "payment-escrow-release-missing-transaction",
      publicMessage: "Ödeme aktarımı için iyzico işlem bilgisi eksik. Admin ekibi bilgilendirildi.",
      statusCode: 500,
    });
  }

  try {
    const { approveIyzicoPaymentItem } = await import(
      "@/services/payments/iyzico-marketplace"
    );

    await approveIyzicoPaymentItem({
      conversationId: payment.iyzico_conversation_id,
      paymentTransactionId: payment.iyzico_payment_transaction_id,
    });
  } catch (error) {
    await markIyzicoEscrowFailed({
      actorUserId,
      error,
      payment,
      supabase,
    });

    throw new AppError("payment-escrow-release-failed", {
      code: "payment-escrow-release-failed",
      publicMessage:
        "iyzico payout onayı başarısız oldu. Admin ekibi acil müdahale için bilgilendirildi.",
      statusCode: 502,
    });
  }

  const now = new Date().toISOString();
  const { data: releasedPayment, error: releaseUpdateError } = await supabase
    .from("payments")
    .update({
      confirmed_at: now,
      confirmed_by: actorUserId,
      escrow_released_at: now,
      escrow_released_by: actorUserId,
      status: PAYMENT_STATUSES.escrowReleased,
      updated_at: now,
    })
    .eq("id", payment.id)
    .eq("status", PAYMENT_STATUSES.escrowHeld)
    .select("id, request_id, amount, payment_method, status, confirmed_at")
    .maybeSingle();

  if (releaseUpdateError) {
    throw handleServiceError(releaseUpdateError, {
      logContext: "iyzico escrow release update failed.",
      publicMessage: "Ödeme aktarıldı ancak kayıt güncellenemedi. Destek ekibiyle iletişime geç.",
      tableName: "payments",
    });
  }

  if (!releasedPayment) {
    const latestPayment = await getPaymentForCustomerConfirmation(
      supabase,
      payment.request_id,
    );

    if (latestPayment?.status === PAYMENT_STATUSES.escrowReleased) {
      return mapPaymentRecord(latestPayment as PaymentRow);
    }

    throw new AppError("payment-escrow-release-race", {
      code: "payment-escrow-release-race",
      publicMessage: "Ödeme durumu bu sırada değişti. Lütfen tekrar kontrol et.",
      statusCode: 409,
    });
  }

  await writeAuditLog(
    {
      action: "payment.escrow_released",
      actorUserId,
      entityId: payment.id,
      entityType: "payment",
      metadata: {
        paymentTransactionId: payment.iyzico_payment_transaction_id,
        requestId: payment.request_id,
      },
    },
    supabase,
  );

  return mapPaymentRecord(releasedPayment as PaymentRow);
}

export async function confirmPaymentByCustomer(
  requestId: string,
  verificationCode: string,
  supabase: PaymentSupabaseClient,
): Promise<PaymentTrackingRecord> {
  if (!isUuid(requestId)) {
    throw new ValidationError("Payment confirmation request id is invalid.", {
      publicMessage: "Talep bilgisi geçerli değil.",
    });
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AuthError("Payment confirmation requires authentication.", {
      cause: authError,
      publicMessage: "Ödemeyi onaylamak için giriş yapmalısın.",
    });
  }

  const { data: request, error: requestError } = await supabase
    .from("service_requests")
    .select("id, confirmation_code, status")
    .eq("id", requestId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (requestError) {
    throw handleServiceError(requestError, {
      logContext: "Customer payment request ownership lookup failed.",
      publicMessage: "Ödeme talebi şu anda kontrol edilemedi.",
      tableName: "service_requests",
    });
  }

  if (!request) {
    throw new AppError("payment-request-not-owned", {
      code: "payment-request-not-owned",
      publicMessage: "Bu talep için ödeme onayı verme yetkin yok.",
      statusCode: 403,
    });
  }

  if (request.status !== "completed") {
    throw new AppError("payment-request-not-completed", {
      code: "payment-request-not-completed",
      publicMessage: "Ödeme yalnızca tamamlanmış işler için onaylanabilir.",
      statusCode: 409,
    });
  }

  const expectedVerificationCode = normalizeCustomerVerificationCode(
    request.confirmation_code,
  );
  const providedVerificationCode = normalizeCustomerVerificationCode(verificationCode);

  if (
    !expectedVerificationCode ||
    providedVerificationCode.length !== 6 ||
    providedVerificationCode !== expectedVerificationCode
  ) {
    throw new AppError("payment-verification-code-invalid", {
      code: "payment-verification-code-invalid",
      publicMessage: "Doğrulama kodu hatalı. Ödeme emanet hesapta beklemeye devam eder.",
      statusCode: 403,
    });
  }

  const privilegedPaymentClient = await getPaymentPrivilegedClient(supabase);
  const paymentForConfirmation = await getPaymentForCustomerConfirmation(
    privilegedPaymentClient,
    requestId,
  );

  if (paymentForConfirmation?.payment_method === PAYMENT_PREFERENCES.iyzico) {
    return releaseIyzicoEscrowPayment({
      actorUserId: user.id,
      payment: paymentForConfirmation,
      supabase: privilegedPaymentClient,
    });
  }

  const now = new Date().toISOString();
  const { data: updatedPayment, error: updateError } = await supabase
    .from("payments")
    .update({
      confirmed_at: now,
      confirmed_by: user.id,
      status: PAYMENT_STATUSES.confirmed,
      updated_at: now,
    })
    .eq("request_id", requestId)
    .eq("status", PAYMENT_STATUSES.pendingConfirmation)
    .select("id, request_id, amount, payment_method, status, confirmed_at")
    .maybeSingle();

  if (updateError) {
    throw handleServiceError(updateError, {
      logContext: "Customer payment confirmation update failed.",
      publicMessage: "Ödeme onayı kaydedilemedi. Lütfen tekrar dene.",
      tableName: "payments",
    });
  }

  if (!updatedPayment) {
    const existingPayment = await getExistingPaymentForRequest(supabase, requestId);

    if (existingPayment?.status === PAYMENT_STATUSES.confirmed) {
      return existingPayment;
    }

    throw new AppError("payment-not-pending", {
      code: "payment-not-pending",
      publicMessage: "Onay bekleyen bir ödeme kaydı bulunamadı.",
      statusCode: 409,
    });
  }

  const payment = mapPaymentRecord(updatedPayment as PaymentRow);
  const auditWritten = await writeAuditLog(
    {
      action: "payment.confirmed_by_customer",
      actorUserId: user.id,
      entityId: payment.id,
      entityType: "payment",
      metadata: {
        paymentMethod: payment.paymentMethod,
        requestId,
        verificationCodeConfirmed: true,
      },
    },
    supabase,
  );

  if (!auditWritten) {
    throw new AppError("payment-audit-failed", {
      code: "payment-audit-failed",
      publicMessage:
        "Ödeme onaylandı ancak işlem kaydı doğrulanamadı. Destek ekibiyle iletişime geç.",
      statusCode: 500,
    });
  }

  return payment;
}
