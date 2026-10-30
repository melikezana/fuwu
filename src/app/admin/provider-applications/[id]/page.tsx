import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AdminPageShell } from "@/components/admin/AdminUI";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { ApplicationDocuments } from "@/components/trust/ApplicationDocuments";
import { getAdminAccess, getAdminProviderApplications, approveAdminProviderApplication, rejectAdminProviderApplication } from "@/services/admin";
import { isUuid } from "@/lib/utils/validation";
import { ApplicationActions } from "../ApplicationActions";
export const dynamic = "force-dynamic";
async function approve(form: FormData) { "use server"; const result = await approveAdminProviderApplication(String(form.get("applicationId"))); revalidatePath("/admin/provider-applications"); redirect(`/admin/provider-applications?applicationAction=${encodeURIComponent(result.code)}`); }
async function reject(form: FormData) { "use server"; const result = await rejectAdminProviderApplication(String(form.get("applicationId"))); revalidatePath("/admin/provider-applications"); redirect(`/admin/provider-applications?applicationAction=${encodeURIComponent(result.code)}`); }
export default async function ApplicationFile({ params }: { params: Promise<{ id: string }> }) {
 const access = await getAdminAccess(); if (!access.ok) return <AdminAccessGate access={access} />;
 const { id } = await params; if (!isUuid(id)) notFound();
 const result = await getAdminProviderApplications(); const a = result.rows.find(row => row.id === id);
 if (!a) return <AdminPageShell active="applications" title="Başvuru okunamadı" description="Bağlantı ve başvuru kimliği kontrol edilmeli." error={result.error}><Link href="/admin/provider-applications">Başvurulara dön</Link></AdminPageShell>;
 return <AdminPageShell active="applications" title={a.fullName} description={`${a.category} · ${a.district}`}><Link className="commerce-back" href="/admin/provider-applications">Başvurulara dön</Link><ApplicationDocuments applicationId={id} admin /><section className="commerce-panel"><h2>Başvuru ve yayın kararı</h2><p>Başvuru onayı belge doğrulaması veya yayın onayı değildir. Yayın kararını mevcut Ustalar dosyasından ver.</p><ApplicationActions applicationId={id} applicationName={a.fullName} phone={a.phone} status={a.status} approveAction={approve} rejectAction={reject} /><Link className="commerce-secondary" href="/admin/providers">Usta dosyalarını aç</Link></section></AdminPageShell>;
}
