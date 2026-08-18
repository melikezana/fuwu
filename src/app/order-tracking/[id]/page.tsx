import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  CircleDot,
  CreditCard,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Timer,
  UserRound,
} from "lucide-react";
import { FuwuLogo } from "@/components/brand/FuwuLogo";
import { PhoneWhatsAppLinks } from "@/components/contact/PhoneWhatsAppLinks";
import { PaymentConfirmationButton } from "@/components/dashboard/PaymentConfirmationButton";
import { RequestChatThread } from "@/components/messaging/RequestChatThread";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { appRoutes, buildLoginRedirectUrl } from "@/lib/constants/navigation";
import {
  SERVICE_REQUEST_STATUSES,
  normalizeServiceRequestStatus,
} from "@/lib/constants/statuses";
import type { Database } from "@/lib/supabase/types";
import { isUuid } from "@/lib/utils/validation";
import { cn } from "@/lib/utils";
import {
  PAYMENT_STATUSES,
  getPaymentPreferenceLabel,
  getPaymentRecordsByRequestIds,
  type PaymentTrackingRecord,
} from "@/services/payments";
import { getServerAuthContext, type ServerAuthContext } from "@/services/auth/server";
import { getUnreadRequestMessageCount } from "@/services/messaging";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order Tracking | Fuwu",
  description: "Fuwu sipariş takip, doğrulama kodu ve ödeme serbest bırakma akışı.",
};

type OrderTrackingPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type RequestRelation = {
  name: string | null;
};

type AssignedProviderRelation =
  | { name: string | null; phone: string | null }
  | { name: string | null; phone: string | null }[]
  | null;

type OrderTrackingRequest = Pick<
  Database["public"]["Tables"]["service_requests"]["Row"],
  | "address"
  | "confirmation_code"
  | "created_at"
  | "description"
  | "emergency_status"
  | "id"
  | "offered_price"
  | "payment_preference"
  | "preferred_date"
  | "preferred_time"
  | "status"
  | "urgency_type"
> & {
  assigned_provider: AssignedProviderRelation;
  districts: RequestRelation | RequestRelation[] | null;
  service_categories: RequestRelation | RequestRelation[] | null;
};

type TimelineState = "complete" | "current" | "pending";

type TimelineItem = {
  description: string;
  label: string;
  state: TimelineState;
};

type OrderTrackingData = {
  payment: PaymentTrackingRecord | null;
  request: OrderTrackingRequest;
};

function getRelationName(relation: RequestRelation | RequestRelation[] | null | undefined) {
  if (Array.isArray(relation)) {
    return relation[0]?.name?.trim() ?? "";
  }

  return relation?.name?.trim() ?? "";
}

function getAssignedProviderContact(relation: AssignedProviderRelation) {
  const provider = Array.isArray(relation) ? relation[0] : relation;
  const name = provider?.name?.trim() ?? "";
  const phone = provider?.phone?.trim() ?? "";

  if (!name && !phone) {
    return null;
  }

  return {
    name: name || "Atanan usta",
    phone: phone || null,
  };
}

function getAssignedProviderName(relation: AssignedProviderRelation) {
  return getAssignedProviderContact(relation)?.name ?? "";
}

function shouldShowAssignedProviderContact(status: string) {
  const normalizedStatus = normalizeServiceRequestStatus(status);

  return (
    normalizedStatus === SERVICE_REQUEST_STATUSES.assigned ||
    normalizedStatus === SERVICE_REQUEST_STATUSES.accepted ||
    normalizedStatus === SERVICE_REQUEST_STATUSES.inProgress
  );
}

function shouldShowRequestMessaging(status: string) {
  const normalizedStatus = normalizeServiceRequestStatus(status);

  return (
    normalizedStatus === SERVICE_REQUEST_STATUSES.assigned ||
    normalizedStatus === SERVICE_REQUEST_STATUSES.accepted ||
    normalizedStatus === SERVICE_REQUEST_STATUSES.inProgress ||
    normalizedStatus === SERVICE_REQUEST_STATUSES.completed
  );
}

function createCustomerToProviderWhatsAppMessage(category: string) {
  return `Merhaba, Fuwu üzerinden ${category} talebim için yazıyorum.`;
}

function formatDateTime(value: string | null) {
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

function formatPreferredSchedule(request: OrderTrackingRequest) {
  const date = request.preferred_date
    ? new Intl.DateTimeFormat("tr-TR", {
        day: "numeric",
        month: "long",
        weekday: "short",
      }).format(new Date(request.preferred_date))
    : "Tarih bekleniyor";
  const time = request.preferred_time?.slice(0, 5) || "Saat aralığı bekleniyor";

  return `${date} / ${time}`;
}

function formatPrice(value: number | string | null) {
  const numericValue = typeof value === "string" ? Number(value) : value;

  if (typeof numericValue !== "number" || !Number.isFinite(numericValue)) {
    return "Toplam hesaplanıyor";
  }

  return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(numericValue)} TL`;
}

function getTimelineItems(
  request: OrderTrackingRequest,
  payment: PaymentTrackingRecord | null,
): TimelineItem[] {
  const normalizedStatus = normalizeServiceRequestStatus(request.status);
  const isProviderAssigned = Boolean(
    getAssignedProviderName(request.assigned_provider) ||
      normalizedStatus === SERVICE_REQUEST_STATUSES.assigned ||
      normalizedStatus === SERVICE_REQUEST_STATUSES.accepted ||
      normalizedStatus === SERVICE_REQUEST_STATUSES.inProgress ||
      normalizedStatus === SERVICE_REQUEST_STATUSES.completed,
  );
  const isProviderOnTheWay = Boolean(
    request.emergency_status === "on_the_way" ||
      normalizedStatus === SERVICE_REQUEST_STATUSES.inProgress ||
      normalizedStatus === SERVICE_REQUEST_STATUSES.completed,
  );
  const isServiceStarted = Boolean(
    normalizedStatus === SERVICE_REQUEST_STATUSES.inProgress ||
      normalizedStatus === SERVICE_REQUEST_STATUSES.completed,
  );
  const isServiceCompleted = normalizedStatus === SERVICE_REQUEST_STATUSES.completed;
  const isPaymentReleased = payment?.status === PAYMENT_STATUSES.confirmed;
  const completionFlags = [
    true,
    isProviderAssigned,
    isProviderOnTheWay,
    isServiceStarted,
    isServiceStarted,
    isServiceCompleted,
    isPaymentReleased,
    isPaymentReleased,
  ];
  const labels = [
    ["Sipariş Alındı", "Sipariş ve online ödeme talebin alındı."],
    ["Usta Atandı", "Uygun usta siparişe bağlanır."],
    ["Usta Yolda", "Usta konuma doğru yola çıkar."],
    ["Usta Ulaştı", "Usta adrese ulaştığında takip ilerler."],
    ["Hizmet Başladı", "Hizmet aktif olarak başlar."],
    ["Hizmet Tamamlandı", "Usta işi tamamlandı olarak işaretler."],
    ["Doğrulama Kodu Onaylandı", "Müşteri kodu doğrulanır."],
    ["Ödeme Serbest Bırakıldı", "Emanet ödeme ustaya serbest bırakılır."],
  ] as const;
  const firstPendingIndex = completionFlags.findIndex((isComplete) => !isComplete);

  return labels.map(([label, description], index) => ({
    description,
    label,
    state:
      completionFlags[index]
        ? "complete"
        : index === firstPendingIndex
          ? "current"
          : "pending",
  }));
}

async function getOrderTrackingData({
  requestId,
  supabase,
  userId,
}: {
  requestId: string;
  supabase: NonNullable<ServerAuthContext["supabase"]>;
  userId: string;
}): Promise<OrderTrackingData | null> {
  const { data, error } = await supabase
    .from("service_requests")
    .select(
      "id, status, urgency_type, emergency_status, confirmation_code, created_at, preferred_date, preferred_time, address, description, offered_price, payment_preference, service_categories(name), districts(name), assigned_provider:providers!service_requests_assigned_provider_id_fkey(name, phone)",
    )
    .eq("id", requestId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const paymentRecords = await getPaymentRecordsByRequestIds(supabase, [requestId]);

  return {
    payment: paymentRecords.get(requestId) ?? null,
    request: data as unknown as OrderTrackingRequest,
  };
}

function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="grid gap-3">
      {items.map((item) => {
        const Icon = item.state === "complete" ? CheckCircle2 : CircleDot;

        return (
          <li
            className={cn(
              "grid grid-cols-[2.75rem_minmax(0,1fr)] gap-3 rounded-lg border bg-white p-4 shadow-[var(--shadow-subtle)]",
              item.state === "complete" &&
                "border-[rgba(23,116,95,0.24)] bg-[var(--trust-green-soft)]",
              item.state === "current" &&
                "border-[rgba(255,138,0,0.36)] bg-[var(--brand-orange-soft)]",
              item.state === "pending" && "border-[var(--border)] opacity-75",
            )}
            key={item.label}
          >
            <span
              className={cn(
                "flex size-10 items-center justify-center rounded-md border bg-white",
                item.state === "complete"
                  ? "border-[rgba(23,116,95,0.25)] text-[var(--trust-green)]"
                  : item.state === "current"
                    ? "border-[rgba(255,138,0,0.35)] text-[var(--brand-orange-dark)]"
                    : "border-[rgba(13,20,36,0.08)] text-[var(--muted)]",
              )}
            >
              <Icon aria-hidden="true" className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-extrabold text-[var(--brand-navy)]">
                {item.label}
              </span>
              <span className="mt-1 block text-xs font-semibold leading-5 text-[var(--muted)]">
                {item.description}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default async function OrderTrackingPage({ params }: OrderTrackingPageProps) {
  const { id } = await params;

  if (!isUuid(id)) {
    notFound();
  }

  const authContext = await getServerAuthContext();

  if (!authContext.user || !authContext.supabase) {
    redirect(buildLoginRedirectUrl(`${appRoutes.orderTracking}/${id}`));
  }

  const data = await getOrderTrackingData({
    requestId: id,
    supabase: authContext.supabase,
    userId: authContext.user.id,
  });

  if (!data) {
    notFound();
  }

  const { payment, request } = data;
  const category = getRelationName(request.service_categories) || "Hizmet Siparişi";
  const district = getRelationName(request.districts) || "Bölge bekleniyor";
  const providerContact = getAssignedProviderContact(request.assigned_provider);
  const providerName = providerContact?.name ?? "";
  const timelineItems = getTimelineItems(request, payment);
  const showProviderContact =
    Boolean(providerContact) && shouldShowAssignedProviderContact(request.status);
  const showMessaging = shouldShowRequestMessaging(request.status);
  const unreadMessageCount = showMessaging
    ? await getUnreadRequestMessageCount(request.id, "customer", authContext.supabase)
    : 0;
  const isPaymentReleased = payment?.status === PAYMENT_STATUSES.confirmed;
  const isServiceCompleted =
    normalizeServiceRequestStatus(request.status) === SERVICE_REQUEST_STATUSES.completed;
  const canReleasePayment =
    isServiceCompleted && payment?.status === PAYMENT_STATUSES.pendingConfirmation;

  return (
    <main className="min-h-screen bg-[var(--surface-soft)]">
      <header className="border-b border-[var(--border)] bg-white">
        <Container className="flex min-h-16 items-center justify-between gap-4">
          <Link href={appRoutes.home} aria-label="Fuwu ana sayfasına git">
            <FuwuLogo size="sm" />
          </Link>
          <Button href={appRoutes.accountRequests} variant="secondary">
            Taleplerim
          </Button>
        </Container>
      </header>

      <Container className="max-w-6xl py-4 sm:py-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="min-w-0">
            <div className="rounded-lg border border-[rgba(249,115,22,0.22)] bg-[var(--gradient-warm-surface)] p-4 shadow-[var(--shadow-elevated)] sm:p-6">
              <p className="text-xs sm:text-sm font-bold uppercase tracking-normal text-[var(--brand-orange-dark)]">
                Sipariş Takibi
              </p>
              <h1 className="mt-1 sm:mt-3 text-2xl sm:text-4xl font-extrabold leading-tight text-[var(--brand-navy)]">
                {category}
              </h1>
              <p className="mt-2 sm:mt-3 max-w-2xl text-xs sm:text-base font-semibold leading-relaxed text-[var(--muted)]">
                Online ödeme emanet hesapta tutulur. Hizmet tamamlandıktan sonra müşteri kodu doğrulanınca ödeme otomatik serbest bırakılır.
              </p>
              <div className="mt-4 sm:mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-md bg-white p-3 ring-1 ring-[rgba(13,20,36,0.08)]">
                  <MapPin aria-hidden="true" className="size-4 text-[var(--brand-orange-dark)]" />
                  <p className="mt-2 text-xs font-bold uppercase text-[var(--muted)]">Bölge</p>
                  <p className="mt-1 text-sm font-extrabold text-[var(--brand-navy)]">{district}</p>
                </div>
                <div className="rounded-md bg-white p-3 ring-1 ring-[rgba(13,20,36,0.08)]">
                  <CalendarDays aria-hidden="true" className="size-4 text-[var(--brand-orange-dark)]" />
                  <p className="mt-2 text-xs font-bold uppercase text-[var(--muted)]">Randevu</p>
                  <p className="mt-1 text-sm font-extrabold text-[var(--brand-navy)]">
                    {formatPreferredSchedule(request)}
                  </p>
                </div>
                <div className="rounded-md bg-white p-3 ring-1 ring-[rgba(13,20,36,0.08)]">
                  <UserRound aria-hidden="true" className="size-4 text-[var(--brand-orange-dark)]" />
                  <p className="mt-2 text-xs font-bold uppercase text-[var(--muted)]">Usta</p>
                  <p className="mt-1 text-sm font-extrabold text-[var(--brand-navy)]">
                    {providerName || "Atama bekleniyor"}
                  </p>
                  {showProviderContact && providerContact?.phone ? (
                    <PhoneWhatsAppLinks
                      className="mt-2"
                      phone={providerContact.phone}
                      whatsappAriaLabel={`${providerContact.name} ustasına WhatsApp üzerinden yaz`}
                      whatsappMessage={createCustomerToProviderWhatsAppMessage(category)}
                    />
                  ) : null}
                </div>
                <div className="rounded-md bg-white p-3 ring-1 ring-[rgba(13,20,36,0.08)]">
                  <CreditCard aria-hidden="true" className="size-4 text-[var(--brand-orange-dark)]" />
                  <p className="mt-2 text-xs font-bold uppercase text-[var(--muted)]">Ödeme</p>
                  <p className="mt-1 text-sm font-extrabold text-[var(--brand-navy)]">
                    {getPaymentPreferenceLabel(request.payment_preference)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <Timeline items={timelineItems} />
            </div>

            {showMessaging ? (
              <div className="mt-6">
                <RequestChatThread
                  collapsible={false}
                  defaultOpen
                  initialUnreadCount={unreadMessageCount}
                  requestId={request.id}
                  senderRole="customer"
                  title="Usta ile yaz"
                />
              </div>
            ) : null}
          </section>

          <aside className="min-w-0 lg:sticky lg:top-24 lg:h-fit">
            <section className="rounded-lg border border-[rgba(10,37,64,0.09)] bg-white p-4 sm:p-5 shadow-[var(--shadow-premium)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-normal text-[var(--brand-orange-dark)]">
                    Güvenli Doğrulama
                  </p>
                  <h2 className="mt-2 text-2xl font-extrabold leading-tight text-[var(--brand-navy)]">
                    Müşteri doğrulaması
                  </h2>
                </div>
                <span className="inline-flex size-11 items-center justify-center rounded-md bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]">
                  <ShieldCheck aria-hidden="true" className="size-5" />
                </span>
              </div>

              <div className="mt-5 rounded-lg bg-[#fffdf9] p-4 ring-1 ring-[rgba(10,37,64,0.08)]">
                <p className="text-xs font-bold uppercase text-[var(--muted)]">
                  6 haneli kod
                </p>
                <p className="mt-2 font-mono text-4xl font-extrabold tracking-[0.24em] text-[var(--brand-navy)]">
                  {request.confirmation_code ?? "------"}
                </p>
                <p className="mt-3 text-xs font-semibold leading-5 text-[var(--muted)]">
                  Bu kod yalnızca müşteri hesabında gösterilir. Ustaya ödeme bu kod girilmeden serbest bırakılmaz.
                </p>
              </div>

              <div className="mt-5 grid gap-3 rounded-lg bg-[var(--surface-soft)] p-4 ring-1 ring-[rgba(10,37,64,0.08)]">
                <div className="flex items-center justify-between gap-3 text-sm font-semibold text-[var(--muted)]">
                  <span>Tutar</span>
                  <span>{formatPrice(payment?.amount ?? request.offered_price)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm font-semibold text-[var(--muted)]">
                  <span>Sipariş tarihi</span>
                  <span>{formatDateTime(request.created_at)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-[rgba(10,37,64,0.12)] pt-3 text-sm font-extrabold text-[var(--brand-navy)]">
                  <span>Escrow durumu</span>
                  <span>{isPaymentReleased ? "Payment Released" : "Escrowda"}</span>
                </div>
              </div>

              {isPaymentReleased ? (
                <p className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--trust-green-soft)] px-4 py-3 text-sm font-extrabold text-[var(--trust-green)]">
                  <PackageCheck aria-hidden="true" className="size-4" />
                  Payment Released
                </p>
              ) : canReleasePayment && payment ? (
                <div className="mt-5">
                  <PaymentConfirmationButton
                    paymentMethod={payment.paymentMethod}
                    requestId={request.id}
                    status={payment.status}
                  />
                </div>
              ) : (
                <p className="mt-5 rounded-lg border border-[rgba(255,138,0,0.22)] bg-[var(--brand-orange-soft)] px-4 py-3 text-sm font-bold leading-6 text-[var(--brand-navy)]">
                  <Timer aria-hidden="true" className="mr-2 inline size-4 align-[-2px]" />
                  Hizmet tamamlandığında ödeme kaydı doğrulama için açılır.
                </p>
              )}
            </section>
          </aside>
        </div>
      </Container>
    </main>
  );
}
