import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AdminPageShell } from "@/components/admin/AdminUI";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { ApplicationDocuments } from "@/components/trust/ApplicationDocuments";
import { getAdminAccess, getAdminProviderApplications, approveAdminProviderApplication, rejectAdminProviderApplication } from "@/services/admin";
import { isUuid } from "@/lib/utils/validation";
import { ApplicationActions } from "../ApplicationActions";
import { APPLICATION_SOURCE_KINDS, APPLICATION_SOURCE_LABELS, classifyApplicationSource, getApplicationSources } from "@/services/admin/application-sources";
export const dynamic = "force-dynamic";
async function approve(form: FormData) { "use server"; const result = await approveAdminProviderApplication(String(form.get("applicationId"))); revalidatePath("/admin/provider-applications"); redirect(`/admin/provider-applications?applicationAction=${encodeURIComponent(result.code)}`); }
async function reject(form: FormData) { "use server"; const result = await rejectAdminProviderApplication(String(form.get("applicationId"))); revalidatePath("/admin/provider-applications"); redirect(`/admin/provider-applications?applicationAction=${encodeURIComponent(result.code)}`); }
async function classify(form: FormData) { "use server"; const id = String(form.get("applicationId")); const result = await classifyApplicationSource(id, String(form.get("kind")), String(form.get("note") ?? "")); revalidatePath("/admin/provider-applications"); redirect(`/admin/provider-applications/${isUuid(id) ? id : ""}?source=${result}`); }
const sourceResults: Record<string, string> = { saved: "Kaynak kararı kaydedildi ve denetim kaydına işlendi.", invalid: "Bir kaynak türü seç ve en az 10 karakterlik gerekçe yaz.", forbidden: "Bu işlem için admin yetkisi gerekiyor.", failed: "Karar kaydedilemedi. Bağlantını kontrol edip yeniden dene." };
export default async function ApplicationFile({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ source?: string }> }) {
 const access = await getAdminAccess(); if (!access.ok) return <AdminAccessGate access={access} />;
 const { id } = await params; if (!isUuid(id)) notFound();
 const [result, sources, query] = await Promise.all([getAdminProviderApplications(), getApplicationSources(), searchParams]); const a = result.rows.find(row => row.id === id); const source = sources?.[id];
 if (!a) return <AdminPageShell active="applications" title="Başvuru okunamadı" description="Bağlantı ve başvuru kimliği kontrol edilmeli." error={result.error}><Link href="/admin/provider-applications">Başvurulara dön</Link></AdminPageShell>;
 return <AdminPageShell active="applications" title={a.fullName} description={`${a.category} · ${a.district}`}><Link className="commerce-back" href="/admin/provider-applications">Başvurulara dön</Link>{query.source && sourceResults[query.source] && <p role={query.source === "saved" ? "status" : "alert"} className={query.source === "saved" ? "commerce-notice" : "commerce-error"}>{sourceResults[query.source]}</p>}
  <section className="commerce-panel" aria-labelledby="source-title"><h2 id="source-title">Başvuru kaynağı</h2>
   {!source ? <p className="commerce-notice" role="status">Kaynak ve hesap bağlantısı okunamadı. Güncel migration uygulanmamış olabilir.</p> : <>
    <dl className="control-facts"><div><dt>Kullanıcı hesabı</dt><dd>{source.linked ? "Bağlı" : "Bağlı değil. Başvuru sahibi başvurudaki telefon ya da e-postayla giriş yaptığında bağlanır."}</dd></div><div><dt>Usta profili</dt><dd>{source.has_provider ? "Var" : "Yok"}</dd></div><div><dt>Kaynak kararı</dt><dd>{APPLICATION_SOURCE_LABELS[source.source_kind]}{source.reviewed_at ? ` · ${new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeZone: "Europe/Istanbul" }).format(new Date(source.reviewed_at))}` : ""}</dd></div>{source.note && <div><dt>Gerekçe</dt><dd>{source.note}</dd></div>}</dl>
    <form action={classify} className="fusion-form"><input type="hidden" name="applicationId" value={id} />
     <label className="commerce-field">Kaynak<select name="kind" required defaultValue={source.source_kind === "unclassified" ? "" : source.source_kind}><option value="" disabled>Seç</option>{APPLICATION_SOURCE_KINDS.map(kind => <option key={kind} value={kind}>{APPLICATION_SOURCE_LABELS[kind]}</option>)}</select></label>
     <label className="commerce-field">Gerekçe<textarea name="note" required minLength={10} maxLength={500} rows={3} placeholder="Örneğin: Telefonla teyit edildi." /></label>
     <p className="commerce-help">Bu karar başvuru durumunu, usta profilini ve yayın kararını değiştirmez. Sonradan yeniden sınıflandırabilirsin; her karar denetim kaydına düşer.</p>
     <button className="commerce-secondary" type="submit">Kaynak Kararını Kaydet</button></form></>}
  </section>
  <ApplicationDocuments applicationId={id} admin /><section className="commerce-panel"><h2>Başvuru ve yayın kararı</h2><p>Başvuru onayı belge doğrulaması veya yayın onayı değildir. Yayın kararını mevcut Ustalar dosyasından ver.</p><ApplicationActions applicationId={id} applicationName={a.fullName} phone={a.phone} status={a.status} approveAction={approve} rejectAction={reject} /><Link className="commerce-secondary" href="/admin/providers">Usta dosyalarını aç</Link></section></AdminPageShell>;
}
