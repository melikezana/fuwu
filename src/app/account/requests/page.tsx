import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, CircleDollarSign, MapPin, ReceiptText, UserRound, WalletCards } from "lucide-react";
import { FuwuLogo } from "@/components/brand/FuwuLogo";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { appRoutes, buildLoginRedirectUrl } from "@/lib/constants/navigation";
import {
  SERVICE_REQUEST_STATUS_LABELS,
  SERVICE_REQUEST_STATUSES,
  normalizeServiceRequestStatus,
} from "@/lib/constants/statuses";
import { getPublicErrorMessage, handleServiceError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { getBudgetTagLabel } from "@/services/matching/budget";
import { getPaymentPreferenceLabel } from "@/services/payments";
import { getServerAuthContext, type ServerAuthContext } from "@/services/auth/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Taleplerim | Fuwu",
  description: "Fuwu hizmet taleplerini ve acil usta çağrılarını takip et.",
};

type AccountRequestsSearchParams = {
  created?: string | string[];
  requestId?: string | string[];
};

type AccountRequestsPageProps = {
  searchParams?: Promise<AccountRequestsSearchParams>;
};

type RequestRelation = {
  name: string | null;
};

type AccountServiceRequest = {
  assigned_provider:
    | { name: string | null }
    | { name: string | null }[]
    | null;
  budget_tag: string | null;
  confirmation_code: string | null;
  created_at: string | null;
  description: string | null;
  districts: RequestRelation | RequestRelation[] | null;
  id: string;
  offered_price: number | string | null;
  payment_preference: string | null;
  service_categories: RequestRelation | RequestRelation[] | null;
  status: string;
  urgency_type: string | null;
};

function getSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function getRelationName(relation: RequestRelation | RequestRelation[] | null | undefined) {
  if (Array.isArray(relation)) {
    return relation[0]?.name?.trim() ?? "";
  }

  return relation?.name?.trim() ?? "";
}

function getAssignedProviderName(
  relation: AccountServiceRequest["assigned_provider"],
) {
  if (Array.isArray(relation)) {
    return relation[0]?.name?.trim() ?? "";
  }

  return relation?.name?.trim() ?? "";
}

function formatDate(value: string | null) {
  if (!value) {
    return "Tarih bekleniyor";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function formatPrice(value: number | string | null) {
  const numericValue = typeof value === "string" ? Number(value) : value;

  if (typeof numericValue !== "number" || !Number.isFinite(numericValue)) {
    return "Teklif yok";
  }

  return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(numericValue)} TL`;
}

function isAssignedStatus(status: string) {
  return normalizeServiceRequestStatus(status) === SERVICE_REQUEST_STATUSES.assigned;
}

function getStatusLabel(status: string) {
  const normalizedStatus = normalizeServiceRequestStatus(status);

  if (isAssignedStatus(status)) {
    return "Usta atandı. Yanıt bekleniyor.";
  }

  if (normalizedStatus === SERVICE_REQUEST_STATUSES.accepted) {
    return "Usta talebini kabul etti.";
  }

  if (normalizedStatus === SERVICE_REQUEST_STATUSES.rejected) {
    return "Usta talebi reddetti. Yeni eşleşme bekleniyor.";
  }

  return normalizedStatus ? SERVICE_REQUEST_STATUS_LABELS[normalizedStatus] : status;
}

function getBudgetLabel(value: string | null) {
  return value ? getBudgetTagLabel(value) || value : "Belirtilmedi";
}

type UserRequestsResult = {
  errorMessage: string | null;
  requests: AccountServiceRequest[];
};

async function getUserRequests(
  supabase: NonNullable<ServerAuthContext["supabase"]>,
  userId: string,
): Promise<UserRequestsResult> {
  const fallbackMessage = "Talepler şu anda yüklenemedi. Lütfen tekrar dene.";
  const { data, error } = await supabase
    .from("service_requests")
    .select(
      "id, status, urgency_type, budget_tag, offered_price, payment_preference, confirmation_code, description, created_at, service_categories(name), districts(name), assigned_provider:providers!service_requests_assigned_provider_id_fkey(name)",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    const appError = handleServiceError(error, {
      logContext: "Account service requests read failed.",
      publicMessage: fallbackMessage,
      tableName: "service_requests",
    });

    return {
      errorMessage: getPublicErrorMessage(appError, fallbackMessage),
      requests: [],
    };
  }

  return {
    errorMessage: null,
    requests: (data ?? []) as unknown as AccountServiceRequest[],
  };
}

function RequestDetailPill({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md bg-[#F9FAFB] px-3 py-2 ring-1 ring-[rgba(13,20,36,0.06)]">
      <dt className="flex items-center gap-1.5 text-[0.68rem] font-medium uppercase text-[var(--muted)]">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-bold leading-5 text-[var(--brand-navy)]">
        {value}
      </dd>
    </div>
  );
}

function RequestCard({
  request,
  isHighlighted,
}: {
  request: AccountServiceRequest;
  isHighlighted: boolean;
}) {
  const category = getRelationName(request.service_categories) || "Hizmet Talebi";
  const district = getRelationName(request.districts) || "İlçe bekleniyor";
  const isEmergency = request.urgency_type === "emergency";
  const assignedProviderName = getAssignedProviderName(request.assigned_provider);

  return (
    <article
      className={cn(
        "rounded-lg border bg-white p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-[rgba(255,138,0,0.45)] hover:shadow-[var(--shadow-elevated)]",
        isHighlighted
          ? "border-[rgba(255,138,0,0.65)] ring-2 ring-[rgba(255,138,0,0.18)]"
          : "border-[var(--border)]",
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold leading-tight text-[var(--brand-navy)]">
              {category}
            </h2>
            {isEmergency ? (
              <span className="rounded-md bg-red-50 px-2 py-1 text-[0.68rem] font-medium uppercase text-red-600 ring-1 ring-red-200">
                Acil
              </span>
            ) : null}
          </div>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--muted)]">
            {request.description || "Talep açıklaması kaydedildi."}
          </p>
        </div>
        <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-[rgba(255,138,0,0.28)] bg-[var(--brand-orange-soft)] px-3 py-1.5 text-xs font-medium text-[var(--brand-orange-dark)]">
          {getStatusLabel(request.status)}
        </span>
      </div>

      <dl className="mt-5 grid gap-3 border-t border-[var(--border)] pt-5 sm:grid-cols-2 lg:grid-cols-4">
        <RequestDetailPill icon={MapPin} label="İlçe" value={district} />
        <RequestDetailPill
          icon={CircleDollarSign}
          label="Bütçe"
          value={`${getBudgetLabel(request.budget_tag)} · ${formatPrice(request.offered_price)}`}
        />
        <RequestDetailPill
          icon={WalletCards}
          label="Ödeme"
          value={getPaymentPreferenceLabel(request.payment_preference)}
        />
        <RequestDetailPill icon={CalendarDays} label="Tarih" value={formatDate(request.created_at)} />
        <RequestDetailPill
          icon={UserRound}
          label="Atanan Usta"
          value={assignedProviderName || "Henüz atanmadı"}
        />
      </dl>

      {request.confirmation_code ? (
        <p className="mt-4 inline-flex rounded-md bg-white px-3 py-2 text-xs font-semibold text-[var(--brand-navy)] ring-1 ring-[rgba(13,20,36,0.08)]">
          Kod: {request.confirmation_code}
        </p>
      ) : null}
    </article>
  );
}

export default async function AccountRequestsPage({
  searchParams,
}: AccountRequestsPageProps) {
  const params = await searchParams;
  const authContext = await getServerAuthContext();

  if (!authContext.user) {
    redirect(buildLoginRedirectUrl(appRoutes.accountRequests));
  }

  if (!authContext.supabase) {
    redirect(buildLoginRedirectUrl(appRoutes.accountRequests));
  }

  const created = getSearchParam(params?.created) === "1";
  const highlightedRequestId = getSearchParam(params?.requestId);
  const { errorMessage, requests } = await getUserRequests(
    authContext.supabase,
    authContext.user.id,
  );

  return (
    <main className="min-h-screen bg-[var(--surface-soft)]">
      <header className="border-b border-[var(--border)] bg-white">
        <Container className="flex min-h-16 items-center justify-between gap-4">
          <Link href={appRoutes.home} aria-label="Fuwu ana sayfasına git">
            <FuwuLogo size="sm" />
          </Link>
          <Button
            href={appRoutes.request}
            variant="secondary"
          >
            Yeni Talep
          </Button>
        </Container>
      </header>

      <Container className="max-w-5xl py-8 sm:py-10">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-[var(--brand-orange-dark)]">
              Hesabım
            </p>
            <h1 className="mt-2 text-3xl font-bold leading-tight text-[var(--brand-navy)]">
              Taleplerim
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--muted)]">
              Oluşturduğun standart ve acil hizmet taleplerini buradan takip edebilirsin.
            </p>
          </div>
          <span className="w-fit rounded-md bg-white px-3 py-2 text-xs font-semibold text-[var(--muted)] ring-1 ring-[rgba(13,20,36,0.08)]">
            {requests.length} talep
          </span>
        </div>

        {created ? (
          <div
            className="mb-5 rounded-lg border border-[rgba(23,116,95,0.24)] bg-[var(--trust-green-soft)] p-4 text-[var(--trust-green)]"
            role="status"
          >
            <div className="flex gap-3">
              <ReceiptText className="mt-0.5 size-5 shrink-0" aria-hidden />
              <div>
                <p className="text-sm font-semibold">Talebiniz başarıyla oluşturuldu</p>
                <p className="mt-1 text-sm font-semibold leading-6">
                  Durum, kategori, ilçe, bütçe ve ödeme bilgilerini aşağıda görebilirsin.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {errorMessage ? (
          <div
            className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700"
            role="alert"
          >
            {errorMessage}
          </div>
        ) : null}

        {requests.length > 0 ? (
          <div className="grid gap-4">
            {requests.map((request) => (
              <RequestCard
                isHighlighted={request.id === highlightedRequestId}
                key={request.id}
                request={request}
              />
            ))}
          </div>
        ) : (
          <section className="rounded-lg border border-dashed border-[rgba(255,138,0,0.38)] bg-white px-6 py-12 text-center">
            <h2 className="text-xl font-bold text-[var(--brand-navy)]">
              Henüz talep oluşturmadın.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-[var(--muted)]">
              İlk hizmet talebini oluşturduğunda detayları burada görünür.
            </p>
            <Button
              className="mt-5"
              href={appRoutes.request}
            >
              Talep Oluştur
            </Button>
          </section>
        )}
      </Container>
    </main>
  );
}
