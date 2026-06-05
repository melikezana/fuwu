import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  ProviderDashboardAccessPlaceholder,
  ProviderDashboardShell,
  ProviderProfileField,
  ProviderStatusBadge,
} from "@/components/dashboard/ProviderDashboardUI";
import { appRoutes } from "@/lib/constants/navigation";
import {
  getProviderAvailabilityLabel,
  providerAvailabilityOptions,
} from "@/lib/constants/providers";
import {
  getProviderDashboardAccess,
  updateProviderDashboardAvailability,
} from "@/services/providers/dashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Profil | Usta Paneli",
  description: "Fuwu onaylı usta profil bilgileri görünümü.",
};

type SearchParams = Record<string, string | string[] | undefined>;

type ProviderDashboardProfilePageProps = {
  searchParams?: Promise<SearchParams>;
};

type AvailabilityFeedback = {
  body: string;
  title: string;
  tone: "error" | "success";
};

const availabilityActionMessages: Record<string, AvailabilityFeedback> = {
  "availability-invalid": {
    body: "Seçilen uygunluk değeri Fuwu operasyon modeliyle uyumlu değil.",
    title: "Uygunluk güncellenemedi",
    tone: "error",
  },
  "availability-missing-profile": {
    body: "Bu oturum için bağlı usta profili bulunamadı.",
    title: "Profil bulunamadı",
    tone: "error",
  },
  "availability-schema-missing": {
    body: "Supabase sağlayıcı uygunluk alanı henüz uygulanmamış. provider-availability.sql çalıştırıldıktan sonra güncelleme aktif olur.",
    title: "Şema güncellemesi gerekli",
    tone: "error",
  },
  "availability-update-failed": {
    body: "Uygunluk durumu şu anda kaydedilemedi. Daha sonra tekrar dene.",
    title: "Güncelleme tamamlanamadı",
    tone: "error",
  },
  "availability-updated": {
    body: "Uygunluk durumu public usta kartlarında kullanılmak üzere güncellendi.",
    title: "Uygunluk güncellendi",
    tone: "success",
  },
  "provider-not-authorized": {
    body: "Bu işlem için bağlı ve onaylı usta rolüyle giriş yapılması gerekiyor.",
    title: "Usta yetkisi gerekli",
    tone: "error",
  },
  "supabase-not-configured": {
    body: "Supabase bağlantısı tanımlı olmadığı için canlı güncelleme yapılamadı.",
    title: "Supabase bağlı değil",
    tone: "error",
  },
};

function getSearchParamValue(searchParams: SearchParams, key: string) {
  const value = searchParams[key];

  return Array.isArray(value) ? value[0] : value;
}

function getAvailabilityFeedback(searchParams: SearchParams) {
  const messageCode = getSearchParamValue(searchParams, "availabilityAction");

  if (!messageCode) {
    return null;
  }

  return availabilityActionMessages[messageCode] ?? null;
}

function redirectToAvailabilityMessage(code: string): never {
  revalidatePath(appRoutes.providerDashboard);
  revalidatePath(appRoutes.providerDashboardProfile);
  revalidatePath(appRoutes.providers);
  revalidatePath("/");
  redirect(`${appRoutes.providerDashboardProfile}?availabilityAction=${encodeURIComponent(code)}`);
}

async function updateAvailabilityAction(formData: FormData) {
  "use server";

  const value = formData.get("availability");
  const result = await updateProviderDashboardAvailability(
    typeof value === "string" ? value : "",
  );

  redirectToAvailabilityMessage(result.code);
}

function AvailabilityActionNotice({
  feedback,
}: {
  feedback: AvailabilityFeedback | null;
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
          <p className="text-sm font-black">{feedback.title}</p>
          <p className="mt-1 text-sm font-semibold leading-6">{feedback.body}</p>
        </div>
      </div>
    </div>
  );
}

export default async function ProviderDashboardProfilePage({
  searchParams,
}: ProviderDashboardProfilePageProps) {
  const providerAccess = await getProviderDashboardAccess();
  const resolvedSearchParams = (await searchParams) ?? {};
  const availabilityFeedback = getAvailabilityFeedback(resolvedSearchParams);

  return (
    <ProviderDashboardShell
      active="profile"
      description="Yayındaki usta profilinde kullanılan temel bilgileri gözden geçir."
      providerName={providerAccess.ok ? providerAccess.profile.name : undefined}
      title="Profil Bilgileri"
    >
      {providerAccess.ok ? (
        <section className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[0_14px_40px_rgba(13,20,36,0.05)] sm:p-6">
          <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 cursor-default select-none">
              <p className="text-sm font-black uppercase text-[var(--brand-orange-dark)]">
                Usta profili
              </p>
              <h2 className="mt-2 text-3xl font-black leading-tight text-[var(--brand-navy)]">
                {providerAccess.profile.name}
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--muted)]">
                {providerAccess.profile.category} hizmeti, {providerAccess.profile.district} bölgesi
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <ProviderStatusBadge tone={providerAccess.profile.isActive ? "green" : "orange"}>
                {providerAccess.profile.isActive ? "Aktif" : "Pasif"}
              </ProviderStatusBadge>
              <ProviderStatusBadge tone={providerAccess.profile.isApproved ? "green" : "orange"}>
                {providerAccess.profile.isApproved ? "Onaylı" : "Onay bekliyor"}
              </ProviderStatusBadge>
              <ProviderStatusBadge tone={providerAccess.profile.availability === "müsait" ? "green" : "orange"}>
                {getProviderAvailabilityLabel(providerAccess.profile.availability)}
              </ProviderStatusBadge>
            </div>
          </div>

          <div className="mt-5 grid gap-4 rounded-lg border border-[rgba(255,138,0,0.24)] bg-[var(--brand-orange-soft)] p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="min-w-0 cursor-default select-none">
              <p className="text-xs font-black uppercase text-[var(--brand-orange-dark)]">
                Uygunluk yönetimi
              </p>
              <h3 className="mt-2 text-xl font-black text-[var(--brand-navy)]">
                Public kartlarda kapasiten net görünsün.
              </h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--muted)]">
                Bu alan canlı Supabase şeması güncellendiğinde provider hesabının kendi uygunluk durumunu güvenli şekilde değiştirir.
              </p>
            </div>
            <form action={updateAvailabilityAction} className="grid gap-3 sm:grid-cols-[minmax(12rem,1fr)_auto]">
              <label className="sr-only" htmlFor="providerAvailability">
                Uygunluk durumu
              </label>
              <select
                className="h-12 min-w-0 rounded-md border border-[var(--border)] bg-white px-3.5 text-sm font-black text-[var(--brand-navy)] outline-none focus:border-[var(--brand-orange)] focus:ring-2 focus:ring-[var(--brand-orange-soft)]"
                defaultValue={providerAccess.profile.availability}
                id="providerAvailability"
                name="availability"
              >
                {providerAvailabilityOptions.map((availability) => (
                  <option key={availability} value={availability}>
                    {getProviderAvailabilityLabel(availability)}
                  </option>
                ))}
              </select>
              <button
                className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-md bg-[var(--brand-navy)] px-4 text-sm font-black text-white transition-colors hover:bg-[var(--brand-navy-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
                type="submit"
              >
                Güncelle
              </button>
            </form>
          </div>

          {availabilityFeedback ? (
            <div className="mt-4">
              <AvailabilityActionNotice feedback={availabilityFeedback} />
            </div>
          ) : null}

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <ProviderProfileField label="Usta adı" value={providerAccess.profile.name} />
            <ProviderProfileField label="Kategori" value={providerAccess.profile.category} />
            <ProviderProfileField label="İlçe" value={providerAccess.profile.district} />
            <ProviderProfileField label="Telefon" value={providerAccess.profile.phone} />
            <ProviderProfileField label="WhatsApp" value={providerAccess.profile.whatsapp} />
            <ProviderProfileField label="Uygunluk" value={getProviderAvailabilityLabel(providerAccess.profile.availability)} />
            <ProviderProfileField label="Ortalama fiyat aralığı" value={providerAccess.profile.averagePriceRange} />
          </div>

          <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-4">
            <p className="cursor-default select-none text-xs font-black uppercase text-[var(--muted)]">
              Açıklama
            </p>
            <p className="mt-2 cursor-default select-none text-sm font-semibold leading-7 text-[var(--brand-navy)]">
              {providerAccess.profile.description}
            </p>
          </div>
        </section>
      ) : (
        <ProviderDashboardAccessPlaceholder
          applicationStatus={providerAccess.applicationStatus}
          message={providerAccess.message}
          reason={providerAccess.reason}
        />
      )}
    </ProviderDashboardShell>
  );
}
