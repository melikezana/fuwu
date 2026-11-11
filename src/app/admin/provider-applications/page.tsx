import Link from "next/link";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { AdminPageShell, AdminCardGrid, AdminMobileCard, AdminStatusBadge, AdminTableWrap } from "@/components/admin/AdminUI";
import { getAdminAccess, getAdminProviderApplications, type AdminProviderApplication } from "@/services/admin";
import { documentIssueLabels } from "@/lib/trust/types";
import { isProviderApplicationStatus } from "@/lib/constants/statuses";
import { APPLICATION_SOURCE_LABELS, getApplicationSources, type ApplicationSource } from "@/services/admin/application-sources";
export const dynamic = "force-dynamic";
export const metadata = { title: "Başvurular | FUWU Admin" };
const labels: Record<string, string> = { pending: "Başvuru Alındı", approved: "Profil Hazırlanıyor", rejected: "Düzeltme Gerekli" };
function Verification({ a }: { a: AdminProviderApplication }) {
 return <span title={documentIssueLabels[a.documentIssue]} className="control-badge">{a.documentStatus ? a.documentStatus : a.documentIssue === "not_uploaded" ? "Yüklenmedi" : "Teknik Hata"}</span>;
}
function Source({ source }: { source?: ApplicationSource }) {
 if (!source) return null;
 return <><AdminStatusBadge tone={source.source_kind === "real" ? "green" : source.source_kind === "unclassified" ? "orange" : "neutral"}>{APPLICATION_SOURCE_LABELS[source.source_kind]}</AdminStatusBadge>{!source.linked && <AdminStatusBadge tone="red">Hesaba bağlı değil</AdminStatusBadge>}</>;
}
export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
 const access = await getAdminAccess(); if (!access.ok) return <AdminAccessGate access={access} />;
 const params = await searchParams, status = isProviderApplicationStatus(params.status || "") ? params.status as "pending" | "approved" | "rejected" : undefined;
 const [result, sources] = await Promise.all([getAdminProviderApplications(status), getApplicationSources()]);
 const sourceFilter = sources && (params.source === "unlinked" || params.source === "unclassified") ? params.source : "";
 const all = result.rows, unlinked = sources ? all.filter(a => sources[a.id] && !sources[a.id].linked).length : 0, unclassified = sources ? all.filter(a => sources[a.id]?.source_kind === "unclassified").length : 0;
 const rows = !sourceFilter || !sources ? all : all.filter(a => sourceFilter === "unlinked" ? sources[a.id] && !sources[a.id].linked : sources[a.id]?.source_kind === "unclassified");
 const href = (next: { status?: string; source?: string }) => { const query = new URLSearchParams({ ...(next.status ? { status: next.status } : {}), ...(next.source ? { source: next.source } : {}) }).toString(); return `/admin/provider-applications${query ? `?${query}` : ""}`; };
 return <AdminPageShell active="applications" title="Usta başvuruları" description="Doğru usta. Doğru hizmet. Kontrol sende." error={result.error} isConfigured={result.isConfigured}>
 <nav className="trust-filters" aria-label="Başvuru filtresi">{[["", "Tümü"], ["pending", "Başvuru Alındı"], ["approved", "Profil Hazırlanıyor"], ["rejected", "Düzeltme Gerekli"]].map(([value, label]) => <Link key={value} className="commerce-secondary" href={href({ status: value, source: sourceFilter })} aria-current={(status || "") === value ? "page" : undefined}>{label}</Link>)}</nav>
 {sources ? <nav className="trust-filters" aria-label="Kaynak filtresi">{([["", "Tüm kaynaklar"], ["unlinked", `Hesaba bağlı değil · ${unlinked}`], ["unclassified", `Kaynağı incelenmedi · ${unclassified}`]] as const).map(([value, label]) => <Link key={value} className="commerce-secondary" href={href({ status, source: value })} aria-current={sourceFilter === value ? "page" : undefined}>{label}</Link>)}</nav> : <p className="commerce-notice" role="status">Başvuru kaynağı ve hesap bağlantısı okunamadı. Güncel migration uygulanmamış olabilir; bilinmeyen kayıtlar bağlı ya da gerçek sayılmaz.</p>}
 {sources && unlinked > 0 && !sourceFilter && <p className="commerce-warning" role="status">{unlinked} başvuru bir kullanıcı hesabına bağlı değil. Başvuru sahibi giriş yapmadan ilerleyemez; kaynağını inceleyip gerçek, deneme ya da eksik olarak işaretle.</p>}
 {params.applicationAction && <p role="status" className="commerce-notice">{({ "application-approved-provider-created": "Başvuru onaylandı. Belge ve yayın incelemesi ayrıca tamamlanmalı.", "application-approved-provider-exists": "Başvuru onaylandı. Mevcut usta profili güncellendi. Belge ve yayın incelemesi ayrıca tamamlanmalı.", "application-rejected": "Başvuru reddedildi.", "application-already-approved": "Başvuru daha önce onaylanmış." } as Record<string, string>)[params.applicationAction] || "İşlem sonucunu başvuru dosyasından kontrol et."}</p>}
 {!result.error && rows.length === 0 && <p className="commerce-panel">Bu filtrede başvuru bulunmuyor.</p>}
 <AdminCardGrid>{rows.map(a => <AdminMobileCard key={a.id}><h2>{a.fullName}</h2><p>{a.category} · {a.district}</p><div className="trust-row"><AdminStatusBadge tone="neutral">{labels[a.status] || a.status}</AdminStatusBadge><Verification a={a} /><Source source={sources?.[a.id]} /></div><Link className="commerce-button" href={`/admin/provider-applications/${a.id}`}>İncele<span className="sr-only">: {a.fullName}</span></Link></AdminMobileCard>)}</AdminCardGrid>
 <AdminTableWrap><table className="w-full text-left text-sm"><thead><tr>{["Ad Soyad", "Meslek", "İlçe", "Başvuru Durumu", "Doğrulama", "Kaynak", "İncele"].map(h => <th className="px-4 py-3" key={h} scope="col">{h}</th>)}</tr></thead><tbody>{rows.map(a => <tr key={a.id}><td className="px-4 py-4 font-semibold">{a.fullName}</td><td className="px-4 py-4">{a.category}</td><td className="px-4 py-4">{a.district}</td><td className="px-4 py-4">{labels[a.status] || a.status}</td><td className="px-4 py-4"><Verification a={a} /></td><td className="px-4 py-4"><span className="flex flex-wrap gap-2"><Source source={sources?.[a.id]} /></span></td><td className="px-4 py-4"><Link className="commerce-secondary" href={`/admin/provider-applications/${a.id}`}>İncele<span className="sr-only">: {a.fullName}</span></Link></td></tr>)}</tbody></table></AdminTableWrap></AdminPageShell>;
}
