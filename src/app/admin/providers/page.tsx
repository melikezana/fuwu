import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  AdminActionButton,
  AdminCardGrid,
  AdminEmptyState,
  AdminMobileCard,
  AdminPageShell,
  AdminStatusBadge,
  AdminTableWrap,
  adminActionIcons,
} from "@/components/admin/AdminUI";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import {
  getProviderAvailabilityLabel,
  getProviderAvailabilityTone,
} from "@/lib/constants/providers";
import { PROVIDER_AVAILABILITY_STATUS_VALUES } from "@/lib/constants/statuses";
import { providerWorkingHourOptions } from "@/lib/providers/trust";
import {
  getAdminAccess,
  getAdminProviders,
  updateAdminProviderTrust,
  updateAdminProviderStatus,
  type AdminProvider,
  type AdminProviderStatusAction,
} from "@/services/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ustalar | Admin",
  description: "Fuwu usta kayıtları için admin görünümü.",
};

const adminProvidersPath = "/admin/providers";

type SearchParams = Record<string, string | string[] | undefined>;

type AdminProvidersPageProps = {
  searchParams?: Promise<SearchParams>;
};

type ProviderActionFeedback = {
  body: string;
  title: string;
  tone: "error" | "success";
};

const providerActionMessages: Record<string, ProviderActionFeedback> = {
  "admin-not-authorized": {
    body: "Bu işlemi tamamlamak için admin rolüne sahip bir Supabase oturumu gerekiyor.",
    title: "Admin yetkisi gerekli",
    tone: "error",
  },
  "provider-action-failed": {
    body: "Supabase işlemi tamamlanamadı. Admin yetkisini ve bağlantı ayarlarını kontrol edip tekrar deneyin.",
    title: "Durum güncellenemedi",
    tone: "error",
  },
  "provider-activated": {
    body: "Usta kaydı aktif hale getirildi. Kayıt onaylıysa public listelerde görünür.",
    title: "Usta aktifleştirildi",
    tone: "success",
  },
  "provider-approved": {
    body: "Usta kaydı aktif ve onaylı hale getirildi; public listelerde yayınlanır.",
    title: "Usta onaylandı",
    tone: "success",
  },
  "provider-deactivated": {
    body: "Usta kaydı pasifleştirildi ve public listelerden kaldırıldı.",
    title: "Usta pasifleştirildi",
    tone: "success",
  },
  "provider-invalid-availability": {
    body: "Seçilen uygunluk değeri geçerli değil. Lütfen listeden bir değer seçin.",
    title: "Uygunluk güncellenemedi",
    tone: "error",
  },
  "provider-invalid-action": {
    body: "Seçilen işlem bu usta kaydı için geçerli değil.",
    title: "Geçersiz işlem",
    tone: "error",
  },
  "provider-invalid-id": {
    body: "Usta kimliği geçerli değil. Sayfayı yenileyip işlemi tekrar deneyin.",
    title: "Geçersiz usta kaydı",
    tone: "error",
  },
  "provider-invalid-name": {
    body: "Usta adı boş olamaz. Lütfen geçerli bir ad girip tekrar deneyin.",
    title: "Usta adı güncellenemedi",
    tone: "error",
  },
  "provider-invalid-price": {
    body: "Ortalama fiyat alanları sayı olmalı, minimum 0 veya üzeri olmalı ve maksimum fiyat minimumdan küçük olmamalı.",
    title: "Fiyat güncellenemedi",
    tone: "error",
  },
  "provider-missing-id": {
    body: "Usta kimliği alınamadı. Sayfayı yenileyip işlemi tekrar deneyin.",
    title: "İşlem yapılamadı",
    tone: "error",
  },
  "provider-not-found": {
    body: "İlgili usta kaydı bulunamadı veya bu kayıt için admin yetkisi yok.",
    title: "Usta bulunamadı",
    tone: "error",
  },
  "provider-trust-updated": {
    body: "Ustanın ad, uygunluk, çalışma saati, fiyat ve doğrulama bilgileri güncellendi.",
    title: "Usta bilgileri güncellendi",
    tone: "success",
  },
  "provider-unpublished": {
    body: "Usta kaydı onaydan çıkarıldı ve public listelerde yayınlanmaz.",
    title: "Usta yayından kaldırıldı",
    tone: "success",
  },
  "provider-unverified": {
    body: "Fuwu Onaylı rozeti kaldırıldı; diğer doğrulama alanları korunur.",
    title: "Usta doğrulaması kaldırıldı",
    tone: "success",
  },
  "provider-verified": {
    body: "Usta Fuwu Onaylı olarak işaretlendi ve public güven rozeti hazırlandı.",
    title: "Usta doğrulandı",
    tone: "success",
  },
  "supabase-not-configured": {
    body: "Supabase ortam değişkenleri tanımlı olmadığı için işlem yapılamadı.",
    title: "Supabase bağlı değil",
    tone: "error",
  },
};

function getFormProviderId(formData: FormData) {
  const value = formData.get("providerId");

  return typeof value === "string" ? value.trim() : "";
}

function getFormProviderStatusAction(formData: FormData) {
  const value = formData.get("statusAction");

  return typeof value === "string" ? value.trim() : "";
}

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function getFormBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function revalidateProviderPublicationPaths() {
  revalidatePath("/");
  revalidatePath("/providers");
  revalidatePath("/providers/[id]", "page");
}

function redirectToProviderActionMessage(code: string): never {
  revalidatePath(adminProvidersPath);
  revalidateProviderPublicationPaths();
  redirect(`${adminProvidersPath}?providerAction=${encodeURIComponent(code)}`);
}

async function updateProviderStatusAction(formData: FormData) {
  "use server";

  const result = await updateAdminProviderStatus(
    getFormProviderId(formData),
    getFormProviderStatusAction(formData),
  );
  redirectToProviderActionMessage(result.code);
}

async function updateProviderTrustAction(formData: FormData) {
  "use server";

  const result = await updateAdminProviderTrust(getFormProviderId(formData), {
    averagePriceMax: getFormString(formData, "averagePriceMax"),
    averagePriceMin: getFormString(formData, "averagePriceMin"),
    availability: getFormString(formData, "availability"),
    identityVerified: getFormBoolean(formData, "identityVerified"),
    isVerified: getFormBoolean(formData, "isVerified"),
    name: getFormString(formData, "name"),
    phoneVerified: getFormBoolean(formData, "phoneVerified"),
    responseTimeMinutes: getFormString(formData, "responseTimeMinutes"),
    workingHours: getFormString(formData, "workingHours"),
  });
  redirectToProviderActionMessage(result.code);
}

function getSearchParamValue(searchParams: SearchParams, key: string) {
  const value = searchParams[key];

  return Array.isArray(value) ? value[0] : value;
}

function getProviderActionFeedback(searchParams: SearchParams) {
  const messageCode = getSearchParamValue(searchParams, "providerAction");

  if (!messageCode) {
    return null;
  }

  return providerActionMessages[messageCode] ?? null;
}

function formatRating(rating: number) {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(rating);
}

function getWorkingHoursFormValue(value: string) {
  return value.replace(/[–—]/g, "-");
}

function formatWorkingHourOption(value: string) {
  return value === "7/24" ? value : value.replace("-", "–");
}

function getProviderUpdateFormId(providerId: string, scope: "mobile" | "table") {
  return `provider-update-${scope}-${providerId}`;
}

function getPriceInputDefaultValue(value: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : "";
}

const adminInputClassName =
  "h-10 w-full rounded-md border border-[var(--border)] bg-white px-2 text-xs font-bold text-[var(--brand-navy)] placeholder:text-[var(--muted)]";

function ProviderNameInput({
  formId,
  provider,
}: {
  formId?: string;
  provider: AdminProvider;
}) {
  return (
    <label className="block min-w-0">
      <span className="sr-only">Usta adı</span>
      <input
        className={adminInputClassName}
        defaultValue={provider.name}
        form={formId}
        maxLength={120}
        name="name"
        required
        type="text"
      />
    </label>
  );
}

function ProviderPriceInputs({
  formId,
  provider,
}: {
  formId?: string;
  provider: AdminProvider;
}) {
  return (
    <div className="flex min-w-[14rem] items-center gap-2">
      <label className="min-w-0 flex-1">
        <span className="sr-only">Minimum fiyat</span>
        <input
          className={adminInputClassName}
          defaultValue={getPriceInputDefaultValue(provider.averagePriceMin)}
          form={formId}
          inputMode="numeric"
          min={0}
          name="averagePriceMin"
          placeholder="500"
          required
          step={1}
          type="number"
        />
      </label>
      <span className="shrink-0 font-semibold text-[var(--muted)]">-</span>
      <label className="min-w-0 flex-1">
        <span className="sr-only">Maksimum fiyat</span>
        <input
          className={adminInputClassName}
          defaultValue={getPriceInputDefaultValue(provider.averagePriceMax)}
          form={formId}
          inputMode="numeric"
          min={0}
          name="averagePriceMax"
          placeholder="2500"
          required
          step={1}
          type="number"
        />
      </label>
      <span className="shrink-0 text-xs font-semibold text-[var(--muted)]">TL</span>
    </div>
  );
}

function ProviderVerificationControls({ provider }: { provider: AdminProvider }) {
  const options = [
    { defaultChecked: provider.isVerified, label: "Fuwu", name: "isVerified" },
    {
      defaultChecked: provider.identityVerified,
      label: "Kimlik",
      name: "identityVerified",
    },
    {
      defaultChecked: provider.phoneVerified,
      label: "Telefon",
      name: "phoneVerified",
    },
  ];

  return (
    <div className="flex min-h-10 flex-wrap items-center gap-2 rounded-md border border-[var(--border)] bg-white px-2 py-1">
      {options.map((option) => (
        <label
          className="inline-flex min-h-7 items-center gap-1.5 text-xs font-semibold text-[var(--brand-navy)]"
          key={option.name}
        >
          <input
            className="h-4 w-4 rounded-md border-[var(--border)] accent-[var(--brand-orange-dark)]"
            defaultChecked={option.defaultChecked}
            name={option.name}
            type="checkbox"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}

function BooleanStatus({
  falseLabel,
  falseTone = "neutral",
  trueLabel,
  value,
}: {
  falseLabel: string;
  falseTone?: "green" | "neutral" | "orange" | "red";
  trueLabel: string;
  value: boolean;
}) {
  return (
    <AdminStatusBadge tone={value ? "green" : falseTone}>
      {value ? trueLabel : falseLabel}
    </AdminStatusBadge>
  );
}

function ProviderActionNotice({
  feedback,
}: {
  feedback: ProviderActionFeedback | null;
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
    <div
      className={`mb-6 rounded-lg border p-4 shadow-[var(--shadow-card)] ${toneClasses}`}
      role={feedback.tone === "success" ? "status" : "alert"}
    >
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

function ProviderActions({ provider }: { provider: AdminProvider }) {
  const actions: Array<{
    action: AdminProviderStatusAction;
    disabled: boolean;
    icon: typeof adminActionIcons.activate;
    label: string;
    title: string;
    tone: "approve" | "neutral" | "reject";
  }> = [
    {
      action: "activate",
      disabled: provider.isActive,
      icon: adminActionIcons.activate,
      label: "Aktifleştir",
      title: provider.isActive ? "Usta zaten aktif" : "Ustayı aktif hale getir",
      tone: "approve",
    },
    {
      action: "deactivate",
      disabled: !provider.isActive,
      icon: adminActionIcons.passive,
      label: "Pasifleştir",
      title: provider.isActive ? "Ustayı pasifleştir" : "Usta zaten pasif",
      tone: "reject",
    },
    {
      action: "approve",
      disabled: provider.isApproved,
      icon: adminActionIcons.approve,
      label: "Onayla",
      title: provider.isApproved ? "Usta zaten onaylı" : "Ustayı onayla",
      tone: "approve",
    },
    {
      action: "unpublish",
      disabled: !provider.isApproved,
      icon: adminActionIcons.reject,
      label: "Yayından Kaldır",
      title: provider.isApproved
        ? "Ustayı yayından kaldır"
        : "Usta zaten yayında değil",
      tone: "reject",
    },
    {
      action: "verify",
      disabled: provider.isVerified,
      icon: adminActionIcons.approve,
      label: "Doğrula",
      title: provider.isVerified ? "Usta zaten Fuwu Onaylı" : "Fuwu Onaylı yap",
      tone: "approve",
    },
    {
      action: "unverify",
      disabled: !provider.isVerified,
      icon: adminActionIcons.reject,
      label: "Doğrulamayı Kaldır",
      title: provider.isVerified ? "Fuwu Onaylı rozetini kaldır" : "Usta zaten doğrulanmamış",
      tone: "reject",
    },
  ];

  return (
    <div className="flex max-w-full flex-wrap gap-2 lg:max-w-[34rem]">
      {actions.map((action) => (
        <form action={updateProviderStatusAction} className="min-w-0 flex-1 sm:flex-none" key={action.action}>
          <input name="providerId" type="hidden" value={provider.id} />
          <input name="statusAction" type="hidden" value={action.action} />
          <AdminActionButton
            className="w-full min-w-0 sm:w-auto sm:min-w-[7rem]"
            disabled={action.disabled}
            icon={action.icon}
            title={action.title}
            tone={action.tone}
            type="submit"
          >
            {action.label}
          </AdminActionButton>
        </form>
      ))}
    </div>
  );
}

function ProviderVerificationBadges({ provider }: { provider: AdminProvider }) {
  return (
    <div className="flex flex-wrap gap-2">
      <BooleanStatus
        falseLabel="Fuwu Onayı Yok"
        falseTone="orange"
        trueLabel="Fuwu Onaylı"
        value={provider.isVerified}
      />
      <BooleanStatus
        falseLabel="Kimlik Bekliyor"
        falseTone="neutral"
        trueLabel="Kimlik Doğrulandı"
        value={provider.identityVerified}
      />
      <BooleanStatus
        falseLabel="Telefon Bekliyor"
        falseTone="neutral"
        trueLabel="Telefon Doğrulandı"
        value={provider.phoneVerified}
      />
    </div>
  );
}

function ProviderTrustForm({
  formId,
  provider,
  showNameField = true,
  showPriceFields = true,
}: {
  formId: string;
  provider: AdminProvider;
  showNameField?: boolean;
  showPriceFields?: boolean;
}) {
  return (
    <form
      action={updateProviderTrustAction}
      className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[9rem_9rem_8rem_14rem_auto]"
      id={formId}
    >
      <input name="providerId" type="hidden" value={provider.id} />
      {showNameField ? <ProviderNameInput provider={provider} /> : null}
      {showPriceFields ? (
        <div className="min-w-0 sm:col-span-2 lg:col-span-2">
          <ProviderPriceInputs provider={provider} />
        </div>
      ) : null}
      <label className="min-w-0">
        <span className="sr-only">Uygunluk</span>
        <select
          className={adminInputClassName}
          defaultValue={provider.availability}
          name="availability"
        >
          {PROVIDER_AVAILABILITY_STATUS_VALUES.map((availability) => (
            <option key={availability} value={availability}>
              {getProviderAvailabilityLabel(availability)}
            </option>
          ))}
        </select>
      </label>
      <label className="min-w-0">
        <span className="sr-only">Çalışma saati</span>
        <select
          className={adminInputClassName}
          defaultValue={getWorkingHoursFormValue(provider.workingHours)}
          name="workingHours"
        >
          {providerWorkingHourOptions.map((workingHours) => (
            <option key={workingHours} value={workingHours}>
              {formatWorkingHourOption(workingHours)}
            </option>
          ))}
        </select>
      </label>
      <label className="min-w-0">
        <span className="sr-only">Ortalama cevap dakikası</span>
        <input
          className={adminInputClassName}
          defaultValue={provider.responseTimeMinutes ?? ""}
          inputMode="numeric"
          max={1440}
          min={1}
          name="responseTimeMinutes"
          placeholder="Yeni Usta"
          type="number"
        />
      </label>
      <div className="min-w-0 sm:col-span-2 lg:col-span-1">
        <ProviderVerificationControls provider={provider} />
      </div>
      <AdminActionButton
        className="h-10 min-h-10 w-full px-2 sm:col-span-2 lg:col-span-1"
        disabled={false}
        icon={adminActionIcons.status}
        tone="neutral"
        type="submit"
      >
        Güncelle
      </AdminActionButton>
    </form>
  );
}

function ProviderMobileCard({ provider }: { provider: AdminProvider }) {
  const updateFormId = getProviderUpdateFormId(provider.id, "mobile");

  return (
    <AdminMobileCard>
      <div className="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-start min-[420px]:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-[var(--brand-navy)]">
            {provider.name}
          </h2>
          <p className="mt-1 text-sm font-bold text-[var(--muted)]">
            {provider.category} · {provider.district}
          </p>
        </div>
        <AdminStatusBadge tone="orange">{formatRating(provider.rating)}</AdminStatusBadge>
      </div>

      <div className="mt-4 grid gap-3 text-sm font-semibold text-[var(--muted)]">
        <p>
          <span className="font-semibold text-[var(--brand-navy)]">Telefon: </span>
          {provider.phone}
        </p>
        <p>
          <span className="font-semibold text-[var(--brand-navy)]">WhatsApp: </span>
          {provider.whatsapp}
        </p>
        <div>
          <span className="mb-2 block font-semibold text-[var(--brand-navy)]">
            Ortalama fiyat
          </span>
          <ProviderPriceInputs formId={updateFormId} provider={provider} />
        </div>
        <div className="flex flex-wrap gap-2">
          <AdminStatusBadge tone={getProviderAvailabilityTone(provider.availability)}>
            {getProviderAvailabilityLabel(provider.availability)}
          </AdminStatusBadge>
          <AdminStatusBadge tone={provider.availabilityStatusTone}>
            {provider.availabilityStatusLabel}
          </AdminStatusBadge>
          <BooleanStatus
            falseLabel="Pasif"
            trueLabel="Aktif"
            value={provider.isActive}
          />
          <BooleanStatus
            falseLabel="Onay Bekliyor"
            falseTone="orange"
            trueLabel="Onaylı"
            value={provider.isApproved}
          />
        </div>
        <ProviderVerificationBadges provider={provider} />
        <p>
          <span className="font-semibold text-[var(--brand-navy)]">Cevap: </span>
          {provider.responseTime}
        </p>
        <p>
          <span className="font-semibold text-[var(--brand-navy)]">Çalışma: </span>
          {provider.workingHours}
        </p>
        <div className="rounded-md bg-[var(--surface-soft)] p-3">
          <p className="font-semibold text-[var(--brand-navy)]">
            Profil Tamamlandı %{provider.profileCompletionScore}
          </p>
          <p className="mt-1 text-xs leading-5">
            Eksikler:{" "}
            {provider.profileCompletionMissingFields.length > 0
              ? provider.profileCompletionMissingFields.join(", ")
              : "Yok"}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <ProviderTrustForm
          formId={updateFormId}
          provider={provider}
          showPriceFields={false}
        />
        <ProviderActions provider={provider} />
      </div>
    </AdminMobileCard>
  );
}

export default async function AdminProvidersPage({
  searchParams,
}: AdminProvidersPageProps) {
  const adminAccess = await getAdminAccess();

  if (!adminAccess.ok) {
    return <AdminAccessGate access={adminAccess} />;
  }

  const [result, resolvedSearchParams] = await Promise.all([
    getAdminProviders(),
    searchParams ?? Promise.resolve({}),
  ]);
  const actionFeedback = getProviderActionFeedback(resolvedSearchParams);

  return (
    <AdminAccessGate access={adminAccess}>
      <AdminPageShell
      active="providers"
      description="Supabase üzerindeki tüm usta kayıtlarını, iletişim bilgilerini ve yayın durumlarını takip et."
      error={result.error}
      isConfigured={result.isConfigured}
      title="Ustalar"
    >
      <ProviderActionNotice feedback={actionFeedback} />
      {result.rows.length === 0 ? (
        <AdminEmptyState title="Henüz usta kaydı yok">
          Supabase üzerinde usta kaydı oluştuğunda ad, kategori, ilçe, iletişim,
          fiyat aralığı ve yayın durumlarıyla burada görünecek.
        </AdminEmptyState>
      ) : (
        <>
          <AdminCardGrid>
            {result.rows.map((provider) => (
              <ProviderMobileCard key={provider.id} provider={provider} />
            ))}
          </AdminCardGrid>

          <AdminTableWrap>
            <table className="w-full min-w-[1900px] text-left text-sm">
              <thead className="bg-[var(--surface-soft)] text-xs font-medium uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3">Usta</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">İlçe</th>
                  <th className="px-4 py-3">Telefon</th>
                  <th className="px-4 py-3">WhatsApp</th>
                  <th className="px-4 py-3">Puan</th>
                  <th className="px-4 py-3">Uygunluk</th>
                  <th className="px-4 py-3">Güven</th>
                  <th className="px-4 py-3">Cevap</th>
                  <th className="px-4 py-3">Çalışma</th>
                  <th className="px-4 py-3">Profil</th>
                  <th className="px-4 py-3">Ortalama Fiyat</th>
                  <th className="px-4 py-3">Aktiflik</th>
                  <th className="px-4 py-3">Onay</th>
                  <th className="px-4 py-3">Aksiyonlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {result.rows.map((provider) => {
                  const updateFormId = getProviderUpdateFormId(provider.id, "table");

                  return (
                  <tr key={provider.id} className="bg-white align-top">
                    <td className="px-4 py-4 font-semibold text-[var(--brand-navy)]">
                      <ProviderNameInput formId={updateFormId} provider={provider} />
                    </td>
                    <td className="px-4 py-4 font-semibold text-[var(--muted)]">
                      {provider.category}
                    </td>
                    <td className="px-4 py-4 font-semibold text-[var(--muted)]">
                      {provider.district}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-[var(--muted)]">
                      {provider.phone}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-[var(--muted)]">
                      {provider.whatsapp}
                    </td>
                    <td className="px-4 py-4 font-semibold text-[var(--brand-navy)]">
                      {formatRating(provider.rating)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-2">
                        <AdminStatusBadge tone={getProviderAvailabilityTone(provider.availability)}>
                          {getProviderAvailabilityLabel(provider.availability)}
                        </AdminStatusBadge>
                        <AdminStatusBadge tone={provider.availabilityStatusTone}>
                          {provider.availabilityStatusLabel}
                        </AdminStatusBadge>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <ProviderVerificationBadges provider={provider} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-[var(--muted)]">
                      {provider.responseTime}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-[var(--muted)]">
                      {provider.workingHours}
                    </td>
                    <td className="px-4 py-4 font-semibold text-[var(--muted)]">
                      <p className="font-semibold text-[var(--brand-navy)]">
                        %{provider.profileCompletionScore}
                      </p>
                      <p className="mt-1 max-w-[16rem] text-xs leading-5">
                        {provider.profileCompletionMissingFields.length > 0
                          ? provider.profileCompletionMissingFields.join(", ")
                          : "Eksik yok"}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-[var(--muted)]">
                      <ProviderPriceInputs formId={updateFormId} provider={provider} />
                    </td>
                    <td className="px-4 py-4">
                      <BooleanStatus
                        falseLabel="Pasif"
                        trueLabel="Aktif"
                        value={provider.isActive}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <BooleanStatus
                        falseLabel="Onay Bekliyor"
                        falseTone="orange"
                        trueLabel="Onaylı"
                        value={provider.isApproved}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-3">
                        <ProviderTrustForm
                          formId={updateFormId}
                          provider={provider}
                          showNameField={false}
                          showPriceFields={false}
                        />
                        <ProviderActions provider={provider} />
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </AdminTableWrap>
        </>
      )}
      </AdminPageShell>
    </AdminAccessGate>
  );
}
