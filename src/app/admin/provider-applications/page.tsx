import Link from "next/link";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { AdminPageShell, AdminCardGrid, AdminMobileCard, AdminStatusBadge, AdminTableWrap } from "@/components/admin/AdminUI";
import { getAdminAccess, getAdminProviderApplications, type AdminProviderApplication } from "@/services/admin";
import { documentIssueLabels } from "@/lib/trust/types";
import { isProviderApplicationStatus } from "@/lib/constants/statuses";
export const dynamic = "force-dynamic";
export const metadata = { title: "Başvurular | FUWU Admin" };
const labels: Record<string, string> = { pending: "Başvuru Alındı", approved: "Profil Hazırlanıyor", rejected: "Düzeltme Gerekli" };
function Verification({ a }: { a: AdminProviderApplication }) {
 return <span title={documentIssueLabels[a.documentIssue]} className="control-badge">{a.documentStatus ? a.documentStatus : a.documentIssue === "not_uploaded" ? "Yüklenmedi" : "Teknik Hata"}</span>;
}
export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
 const access = await getAdminAccess(); if (!access.ok) return <AdminAccessGate access={access} />;
 const params = await searchParams, status = isProviderApplicationStatus(params.status || "") ? params.status as "pending" | "approved" | "rejected" : undefined;
 const result = await getAdminProviderApplications(status);
 return <AdminPageShell active="applications" title="Usta başvuruları" description="Doğru usta. Doğru hizmet. Kontrol sende." error={result.error} isConfigured={result.isConfigured}>
 <nav className="trust-filters" aria-label="Başvuru filtresi">{[["", "Tümü"], ["pending", "Başvuru Alındı"], ["approved", "Profil Hazırlanıyor"], ["rejected", "Düzeltme Gerekli"]].map(([value, label]) => <Link key={value} className="commerce-secondary" href={`/admin/provider-applications${value ? `?status=${value}` : ""}`} aria-current={(status || "") === value ? "page" : undefined}>{label}</Link>)}</nav>
 {params.applicationAction && <p role="status" className="commerce-notice">{({ "application-approved-provider-created": "Başvuru onaylandı. Belge ve yayın incelemesi ayrıca tamamlanmalı.", "application-rejected": "Başvuru reddedildi.", "application-already-approved": "Başvuru daha önce onaylanmış." } as Record<string, string>)[params.applicationAction] || "İşlem sonucunu başvuru dosyasından kontrol et."}</p>}
 {!result.error && result.rows.length === 0 && <p className="commerce-panel">Bu filtrede başvuru bulunmuyor.</p>}
 <AdminCardGrid>{result.rows.map(a => <AdminMobileCard key={a.id}><h2>{a.fullName}</h2><p>{a.category} · {a.district}</p><div className="trust-row"><AdminStatusBadge tone="neutral">{labels[a.status] || a.status}</AdminStatusBadge><Verification a={a} /></div><Link className="commerce-button" href={`/admin/provider-applications/${a.id}`}>İncele<span className="sr-only">: {a.fullName}</span></Link></AdminMobileCard>)}</AdminCardGrid>
 <AdminTableWrap><table className="w-full text-left text-sm"><thead><tr>{["Ad Soyad", "Meslek", "İlçe", "Başvuru Durumu", "Doğrulama", "İncele"].map(h => <th className="px-4 py-3" key={h} scope="col">{h}</th>)}</tr></thead><tbody>{result.rows.map(a => <tr key={a.id}><td className="px-4 py-4 font-semibold">{a.fullName}</td><td className="px-4 py-4">{a.category}</td><td className="px-4 py-4">{a.district}</td><td className="px-4 py-4">{labels[a.status] || a.status}</td><td className="px-4 py-4"><Verification a={a} /></td><td className="px-4 py-4"><Link className="commerce-secondary" href={`/admin/provider-applications/${a.id}`}>İncele<span className="sr-only">: {a.fullName}</span></Link></td></tr>)}</tbody></table></AdminTableWrap></AdminPageShell>;
}
