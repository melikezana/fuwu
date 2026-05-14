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
  getAdminAccess,
  getAdminProviders,
  updateAdminProviderStatus,
  type AdminProvider,
  type AdminProviderStatusAction,
} from "@/services/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ustalar | Fuwu Admin",
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
  "provider-invalid-action": {
    body: "Seçilen işlem bu usta kaydı için geçerli değil.",
    title: "Geçersiz işlem",
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
  "provider-unpublished": {
    body: "Usta kaydı onaydan çıkarıldı ve public listelerde yayınlanmaz.",
    title: "Usta yayından kaldırıldı",
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
      className={`mb-6 rounded-lg border p-4 shadow-[0_12px_34px_rgba(13,20,36,0.05)] ${toneClasses}`}
      role={feedback.tone === "success" ? "status" : "alert"}
    >
      <div className="flex gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div>
          <p className="text-sm font-black">{feedback.title}</p>
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

function ProviderMobileCard({ provider }: { provider: AdminProvider }) {
  return (
    <AdminMobileCard>
      <div className="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-start min-[420px]:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-black text-[var(--brand-navy)]">
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
          <span className="font-black text-[var(--brand-navy)]">Telefon: </span>
          {provider.phone}
        </p>
        <p>
          <span className="font-black text-[var(--brand-navy)]">WhatsApp: </span>
          {provider.whatsapp}
        </p>
        <p>
          <span className="font-black text-[var(--brand-navy)]">
            Ortalama fiyat:{" "}
          </span>
          {provider.averagePriceRange}
        </p>
        <div className="flex flex-wrap gap-2">
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
      </div>

      <div className="mt-4">
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
            <table className="w-full min-w-[1320px] text-left text-sm">
              <thead className="bg-[var(--surface-soft)] text-xs font-black uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3">Usta</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">İlçe</th>
                  <th className="px-4 py-3">Telefon</th>
                  <th className="px-4 py-3">WhatsApp</th>
                  <th className="px-4 py-3">Puan</th>
                  <th className="px-4 py-3">Ortalama Fiyat</th>
                  <th className="px-4 py-3">Aktiflik</th>
                  <th className="px-4 py-3">Onay</th>
                  <th className="px-4 py-3">Aksiyonlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {result.rows.map((provider) => (
                  <tr key={provider.id} className="bg-white align-top">
                    <td className="px-4 py-4 font-black text-[var(--brand-navy)]">
                      {provider.name}
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
                    <td className="px-4 py-4 font-black text-[var(--brand-navy)]">
                      {formatRating(provider.rating)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-[var(--muted)]">
                      {provider.averagePriceRange}
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
                      <ProviderActions provider={provider} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminTableWrap>
        </>
      )}
      </AdminPageShell>
    </AdminAccessGate>
  );
}
