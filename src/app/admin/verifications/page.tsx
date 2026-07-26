import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { AdminPageShell, AdminStatusBadge } from "@/components/admin/AdminUI";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { EmptyAdminState } from "@/components/admin/EmptyAdminState";
import {
  approveAdminProviderApplication,
  getAdminAccess,
  rejectAdminProviderApplication,
} from "@/services/admin";
import { getAdminVerificationDocuments } from "@/services/admin/verifications";
import { buildLoginRedirectUrl } from "@/lib/constants/navigation";
import { ApplicationActions } from "../provider-applications/ApplicationActions";

const statusBadge: Record<string, { label: string; tone: "green" | "orange" | "red" | "neutral" }> = {
  approved: { label: "Onaylı", tone: "green" },
  pending: { label: "Bekliyor", tone: "orange" },
  rejected: { label: "Reddedildi", tone: "red" },
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Belge Doğrulama | Admin",
  description: "Usta başvurularının doğrulama belgelerini incele.",
};

async function approveAction(formData: FormData) {
  "use server";
  const id = String(formData.get("applicationId") ?? "");
  await approveAdminProviderApplication(id);
  revalidatePath("/admin/verifications");
}

async function rejectAction(formData: FormData) {
  "use server";
  const id = String(formData.get("applicationId") ?? "");
  await rejectAdminProviderApplication(id);
  revalidatePath("/admin/verifications");
}

export default async function AdminVerificationsPage() {
  const adminAccess = await getAdminAccess();

  if (!adminAccess.ok && adminAccess.reason === "missing-session") {
    redirect(buildLoginRedirectUrl("/admin/verifications"));
  }
  if (!adminAccess.ok) {
    return <AdminAccessGate access={adminAccess} />;
  }

  const { rows, error } = await getAdminVerificationDocuments();

  return (
    <AdminAccessGate access={adminAccess}>
      <AdminPageShell
        active="verifications"
        breadcrumbLabel="Belge Doğrulama"
        description="Ustaların yüklediği kimlik/doğrulama belgelerini incele ve başvuruyu onayla veya reddet."
        error={error}
        title="Belge Doğrulama"
      >
        {rows.length === 0 ? (
          <EmptyAdminState message="Belge yüklenmiş başvuru bulunmuyor." />
        ) : (
          <div className="flex flex-col gap-4">
            {rows.map((item) => (
              <section
                className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)]"
                key={item.id}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-base font-bold text-[var(--brand-navy)]">
                        {item.applicantName}
                      </p>
                      <AdminStatusBadge tone={statusBadge[item.status]?.tone ?? "neutral"}>
                        {statusBadge[item.status]?.label ?? item.status}
                      </AdminStatusBadge>
                    </div>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {item.phone || "Telefon yok"} ·{" "}
                      {new Date(item.createdAt).toLocaleDateString("tr-TR")}
                    </p>
                    {item.documentUrl ? (
                      <a
                        className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-sm font-semibold text-[var(--brand-orange-dark)] hover:bg-[var(--surface-soft)]"
                        href={item.documentUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <FileText className="h-4 w-4" aria-hidden />
                        Belgeyi Görüntüle
                      </a>
                    ) : (
                      <p className="mt-2 text-sm font-semibold text-red-600">
                        Belge bağlantısı oluşturulamadı.
                      </p>
                    )}
                  </div>

                  <ApplicationActions
                    applicationId={item.id}
                    applicationName={item.applicantName}
                    approveAction={approveAction}
                    phone={item.phone}
                    rejectAction={rejectAction}
                    status={item.status}
                  />
                </div>
              </section>
            ))}
          </div>
        )}
      </AdminPageShell>
    </AdminAccessGate>
  );
}
