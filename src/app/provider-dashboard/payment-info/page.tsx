import type { Metadata } from "next";
import { AlertTriangle, CheckCircle2, CreditCard, ShieldCheck } from "lucide-react";
import {
  getProviderDashboardStatusBadgeView,
  ProviderDashboardApplicationPlaceholder,
  ProviderDashboardShell,
  ProviderStatusBadge,
} from "@/components/dashboard/ProviderDashboardUI";
import {
  getProviderDashboardAccess,
  PROVIDER_IYZICO_SUBMERCHANT_STATUS_LABELS,
  type ProviderIyzicoSubmerchantStatus,
} from "@/services/providers/dashboard";
import { updateProviderPaymentInfoAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ödeme Bilgileri | Usta Paneli",
  description: "Fuwu usta payout ve iyzico pazaryeri kayıt bilgileri.",
};

type SearchParams = Record<string, string | string[] | undefined>;

type ProviderPaymentInfoPageProps = {
  searchParams?: Promise<SearchParams>;
};

type PaymentInfoFeedback = {
  body: string;
  title: string;
  tone: "error" | "success";
};

const paymentInfoActionMessages: Record<string, PaymentInfoFeedback> = {
  "payment-info-invalid-address": {
    body: "iyzico kaydı için yasal kayıt adresini en az 5 karakter olacak şekilde gir.",
    title: "Adres eksik",
    tone: "error",
  },
  "payment-info-invalid-iban": {
    body: "IBAN TR ile başlamalı ve 26 karakter olmalı.",
    title: "IBAN geçersiz",
    tone: "error",
  },
  "payment-info-invalid-legal-name": {
    body: "Yasal ad veya şirket unvanı en az 3 karakter olmalı.",
    title: "Yasal ad eksik",
    tone: "error",
  },
  "payment-info-invalid-tax-id": {
    body: "TCKN 11 hane, vergi numarası 10 hane olmalı.",
    title: "Vergi/TCKN bilgisi geçersiz",
    tone: "error",
  },
  "payment-info-iyzico-failed": {
    body: "Bilgiler kaydedildi, ancak iyzico alt üye işyeri kaydı başlatılamadı. Lütfen daha sonra tekrar dene.",
    title: "iyzico bağlantısı başarısız",
    tone: "error",
  },
  "payment-info-iyzico-missing-key": {
    body: "iyzico başarılı bir yanıt döndürmedi. Destek ekibi ödeme kaydını kontrol edecek.",
    title: "Alt üye işyeri anahtarı alınamadı",
    tone: "error",
  },
  "payment-info-missing-email": {
    body: "iyzico kaydı için hesabında doğrulanmış e-posta bulunmalı.",
    title: "E-posta eksik",
    tone: "error",
  },
  "payment-info-missing-phone": {
    body: "iyzico kaydı için provider telefonun geçerli formatta olmalı.",
    title: "Telefon eksik",
    tone: "error",
  },
  "payment-info-rate-limited": {
    body: "Ödeme bilgileri kısa sürede çok fazla gönderildi. Lütfen biraz bekle.",
    title: "Çok fazla deneme",
    tone: "error",
  },
  "payment-info-submitted": {
    body: "Ödeme bilgilerin kaydedildi ve iyzico incelemesine gönderildi.",
    title: "Ödeme kaydı başlatıldı",
    tone: "success",
  },
  "payment-info-tax-office-required": {
    body: "Vergi numarası kullanıyorsan vergi dairesi alanı da zorunlu.",
    title: "Vergi dairesi gerekli",
    tone: "error",
  },
  "payment-info-update-failed": {
    body: "Ödeme bilgilerini kaydedemedik. Lütfen tekrar dene.",
    title: "Kayıt tamamlanamadı",
    tone: "error",
  },
  "provider-not-authorized": {
    body: "Bu işlem için onaylı usta hesabıyla giriş yapmalısın.",
    title: "Usta yetkisi gerekli",
    tone: "error",
  },
};

function getSearchParamValue(searchParams: SearchParams, key: string) {
  const value = searchParams[key];

  return Array.isArray(value) ? value[0] : value;
}

function getPaymentInfoFeedback(searchParams: SearchParams) {
  const messageCode = getSearchParamValue(searchParams, "paymentInfoAction");

  return messageCode ? paymentInfoActionMessages[messageCode] ?? null : null;
}

function getSubmerchantStatusTone(status: ProviderIyzicoSubmerchantStatus) {
  if (status === "active") {
    return "green" as const;
  }

  if (status === "rejected") {
    return "red" as const;
  }

  return "orange" as const;
}

function PaymentInfoNotice({
  feedback,
}: {
  feedback: PaymentInfoFeedback | null;
}) {
  if (!feedback) {
    return null;
  }

  const Icon = feedback.tone === "success" ? CheckCircle2 : AlertTriangle;
  const toneClasses =
    feedback.tone === "success"
      ? "border-[rgba(23,116,95,0.24)] bg-[var(--trust-green-soft)] text-[var(--trust-green)]"
      : "border-red-200 bg-red-50 text-red-700";

  return (
    <div className={`rounded-lg border p-4 ${toneClasses}`} role={feedback.tone === "success" ? "status" : "alert"}>
      <div className="flex gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div>
          <p className="text-sm font-semibold">{feedback.title}</p>
          <p className="mt-1 text-sm font-semibold leading-6">{feedback.body}</p>
        </div>
      </div>
    </div>
  );
}

function PaymentInfoInput({
  autoComplete,
  defaultValue,
  helpText,
  label,
  name,
  placeholder,
  required = true,
}: {
  autoComplete?: string;
  defaultValue?: string;
  helpText?: string;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-[var(--brand-navy)]">{label}</span>
      <input
        autoComplete={autoComplete}
        className="premium-control min-h-12 px-3.5 text-sm font-semibold outline-none"
        defaultValue={defaultValue}
        name={name}
        placeholder={placeholder}
        required={required}
      />
      {helpText ? (
        <span className="text-xs font-semibold leading-5 text-[var(--muted)]">
          {helpText}
        </span>
      ) : null}
    </label>
  );
}

export default async function ProviderPaymentInfoPage({
  searchParams,
}: ProviderPaymentInfoPageProps) {
  const providerAccess = await getProviderDashboardAccess();
  const resolvedSearchParams = (await searchParams) ?? {};
  const feedback = getPaymentInfoFeedback(resolvedSearchParams);
  const statusBadge = getProviderDashboardStatusBadgeView(
    providerAccess.ok
      ? providerAccess.application?.status
      : providerAccess.applicationStatus,
    providerAccess.ok,
  );

  return (
    <ProviderDashboardShell
      active="paymentInfo"
      description="Online ödemelerde escrow sonrası payout alabilmek için iyzico pazaryeri bilgilerini tamamla."
      providerName={providerAccess.ok ? providerAccess.profile.name : undefined}
      statusLabel={statusBadge.label}
      statusTone={statusBadge.tone}
      title="Ödeme Bilgileri"
    >
      {providerAccess.ok ? (
        <section className="premium-card p-5 sm:p-6">
          <div className="flex flex-col gap-5 border-b border-[var(--border)] pb-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 cursor-default select-none">
              <p className="text-sm font-medium uppercase text-[var(--brand-orange-dark)]">
                iyzico pazaryeri
              </p>
              <h2 className="mt-2 text-3xl font-bold leading-tight text-[var(--brand-navy)]">
                Payout hesabı
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--muted)]">
                Online ödeme alan talepleri kabul etmek için alt üye işyeri kaydın aktif olmalı.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ProviderStatusBadge
                tone={getSubmerchantStatusTone(providerAccess.profile.iyzicoSubmerchantStatus)}
              >
                {PROVIDER_IYZICO_SUBMERCHANT_STATUS_LABELS[
                  providerAccess.profile.iyzicoSubmerchantStatus
                ]}
              </ProviderStatusBadge>
              <ProviderStatusBadge tone={providerAccess.profile.payoutIban ? "green" : "orange"}>
                {providerAccess.profile.payoutIban ? "IBAN kayıtlı" : "IBAN eksik"}
              </ProviderStatusBadge>
            </div>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
            <form action={updateProviderPaymentInfoAction} className="grid gap-4">
              <PaymentInfoInput
                autoComplete="name"
                defaultValue={providerAccess.profile.legalName}
                helpText="TCKN kullanıyorsan ad soyad, vergi numarası kullanıyorsan şirket unvanı."
                label="Yasal ad / şirket unvanı"
                name="legalName"
              />
              <PaymentInfoInput
                autoComplete="off"
                defaultValue={providerAccess.profile.payoutIban}
                helpText="TR ile başlayan kişisel veya şirket IBAN'ı."
                label="Payout IBAN"
                name="payoutIban"
                placeholder="TR000000000000000000000000"
              />
              <div className="grid gap-4 md:grid-cols-2">
                <PaymentInfoInput
                  autoComplete="off"
                  defaultValue={providerAccess.profile.taxIdentityNumber}
                  helpText="TCKN 11 hane, vergi numarası 10 hane."
                  label="TCKN / vergi numarası"
                  name="taxIdentityNumber"
                />
                <PaymentInfoInput
                  autoComplete="off"
                  defaultValue={providerAccess.profile.taxOffice}
                  helpText="Vergi numarası ile kayıt yapıyorsan zorunlu."
                  label="Vergi dairesi"
                  name="taxOffice"
                  required={false}
                />
              </div>
              <PaymentInfoInput
                autoComplete="street-address"
                defaultValue={providerAccess.profile.payoutAddress}
                helpText="iyzico alt üye işyeri kaydı için yasal kayıt adresi gerekir."
                label="Yasal kayıt adresi"
                name="payoutAddress"
              />
              <button
                className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-md bg-[var(--brand-navy)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-navy-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2 sm:w-fit"
                type="submit"
              >
                Bilgileri iyzico&apos;ya gönder
              </button>
            </form>

            <aside className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-4">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]">
                <CreditCard className="h-5 w-5" aria-hidden />
              </div>
              <p className="mt-4 text-xs font-medium uppercase text-[var(--muted)]">
                Payout durumu
              </p>
              <p className="mt-2 text-lg font-bold leading-6 text-[var(--brand-navy)]">
                {PROVIDER_IYZICO_SUBMERCHANT_STATUS_LABELS[
                  providerAccess.profile.iyzicoSubmerchantStatus
                ]}
              </p>
              <p className="mt-3 text-sm font-semibold leading-6 text-[var(--muted)]">
                Durum aktif olmadan online ödeme alan talepler kabul edilemez.
              </p>
              <div className="mt-5 grid gap-3 border-t border-[var(--border)] pt-5">
                <div className="rounded-md bg-white px-3 py-2">
                  <p className="text-[0.68rem] font-medium uppercase leading-4 text-[var(--muted)]">
                    Provider ID
                  </p>
                  <p className="mt-1 break-all font-mono text-xs font-bold leading-5 text-[var(--brand-navy)]">
                    {providerAccess.profile.id}
                  </p>
                </div>
                <div className="rounded-md bg-white px-3 py-2">
                  <p className="text-[0.68rem] font-medium uppercase leading-4 text-[var(--muted)]">
                    Güvenlik
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-5 text-[var(--brand-navy)]">
                    Tutar sunucuda talep fiyatından hesaplanır.
                  </p>
                </div>
                <div className="flex items-start gap-2 rounded-md border border-[rgba(23,116,95,0.18)] bg-[var(--trust-green-soft)] px-3 py-2 text-[var(--trust-green)]">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <p className="text-xs font-bold leading-5">
                    Aktif olduğunda escrow ödemeleri iş tamamlanana kadar bekletilir.
                  </p>
                </div>
              </div>
            </aside>
          </div>

          {feedback ? (
            <div className="mt-5">
              <PaymentInfoNotice feedback={feedback} />
            </div>
          ) : null}
        </section>
      ) : (
        <ProviderDashboardApplicationPlaceholder
          application={providerAccess.application}
          applicationStatus={providerAccess.applicationStatus}
          message={providerAccess.message}
          reason={providerAccess.reason}
        />
      )}
    </ProviderDashboardShell>
  );
}
