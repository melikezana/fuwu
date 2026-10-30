import Link from "next/link";
import { Users, ArrowUpRight, Search } from "lucide-react";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { AdminEmptyState, AdminPageShell } from "@/components/admin/AdminUI";
import { ProviderInspector, PublicationBadge } from "@/components/admin/ProviderInspector";
import { getAdminAccess } from "@/services/admin";
import { getProviderDirectory, getProviderDetail, providerFilters } from "@/services/admin/provider-control";
import { updateProviderStatusAction } from "./actions";
import { isUuid } from "@/lib/utils/validation";
export const dynamic = "force-dynamic";
export const metadata = { title: "Usta Yönetimi | FUWU Control Center" };
type SearchParams = Record<string, string | string[] | undefined>;
export default async function AdminProvidersPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
 const access = await getAdminAccess();
 if (!access.ok) return <AdminAccessGate access={access} />;
 const params = await searchParams ?? {};
 const q = typeof params.q === "string" ? params.q.slice(0, 120) : "";
 const filter = typeof params.filter === "string" && Object.hasOwn(providerFilters, params.filter) ? params.filter : "all";
 const page = Math.min(100000, Math.max(1, Math.floor(Number(params.page)) || 1));
 const id = typeof params.id === "string" && isUuid(params.id) ? params.id : null;
 const result = await getProviderDirectory(id ? "" : q, id ? "all" : filter, id ? 1 : page, id ?? undefined);
 const link = (patch: Record<string, string>) => `/admin/providers?${new URLSearchParams({ q, filter, page: String(page), ...patch })}`;
 const p = id ? result.rows.find(row => row.id === id) : null;
 const detail = p ? await getProviderDetail(p.id) : null;
 return <AdminAccessGate access={access}><AdminPageShell active="providers" breadcrumbLabel="Usta Yönetimi" title="Usta Yönetimi" description="Doğru karar için gereken her şey, tek usta dosyasında.">
  {result.error ? <section className="commerce-panel control-unavailable" role="alert"><h2>{result.error.message}</h2><p>{result.error.detail}</p><p>Usta sayısı bilinmiyor. Kayıtlar okunamadı.</p><Link href="/admin/marketplace?view=health" className="commerce-secondary">Sistem sağlığını incele</Link></section> : id ? p ? <ProviderInspector key={p.id} provider={p} detail={detail} action={updateProviderStatusAction} backHref={link({})} /> : <AdminEmptyState title="Usta bulunamadı">Kayıt kimliğini kontrol et. <Link href={link({})}>Listeye dön</Link></AdminEmptyState> : <>
   <form className="control-search" action="/admin/providers"><input type="hidden" name="filter" value={filter} /><label htmlFor="provider-search"><Search size={19} aria-hidden /><span className="sr-only">İsim, kategori veya ilçe ara</span><input id="provider-search" name="q" type="search" maxLength={120} defaultValue={q} placeholder="İsim, kategori veya ilçe ara" /></label><button type="submit" className="commerce-button">Ara</button></form>
   <nav className="control-filters" aria-label="Usta filtreleri">{Object.entries(providerFilters).map(([key, label]) => <Link key={key} href={link({ filter: key, page: "1" })} aria-current={filter === key ? "page" : undefined}>{label}</Link>)}</nav>
   <div className="control-list-heading"><h2><Users size={20} aria-hidden /> Usta ağı</h2><p>{result.total} kayıt · Sayfa {result.page}</p></div>
   {result.rows.length === 0 ? <AdminEmptyState title="Bu görünümde usta yok">Aramayı veya seçtiğin filtreyi değiştirebilirsin.</AdminEmptyState> : <>
    <div className="control-provider-cards">{result.rows.map(row => <article key={row.id} className="control-provider-card"><div className="control-row-title"><div className="control-avatar" aria-hidden>{row.name.slice(0, 1).toLocaleUpperCase("tr-TR")}</div><div><h3>{row.name}</h3><p>{row.category} · {row.district}</p></div></div><div className="control-card-status"><PublicationBadge provider={row} /><span>{row.identity_verified && row.phone_verified ? "Kimlik ve telefon doğrulandı" : "Doğrulama incelenecek"}</span></div><Link className="commerce-secondary" href={link({ id: row.id })} aria-label={`${row.name} dosyasını incele`}>İncele <ArrowUpRight size={17} aria-hidden /></Link></article>)}</div>
    <div className="control-table-wrap"><table className="control-provider-table"><thead><tr>{["Usta", "Uzmanlık", "İlçe", "Doğrulama", "Yayın Durumu", "Son Güncelleme", "İncele"].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{result.rows.map(row => <tr key={row.id}><td><strong>{row.name}</strong><span className="control-record-kind">{row.record_kind === "real" ? "Gerçek kayıt" : row.record_kind === "test" ? "Test / Demo" : "Kaynağı incelenecek"}</span></td><td>{row.category || "—"}</td><td>{row.district || "—"}</td><td>{row.identity_verified && row.phone_verified ? "Kimlik ve telefon" : "İncelenecek"}</td><td><PublicationBadge provider={row} /></td><td><time dateTime={row.updated_at}>{new Date(row.updated_at).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" })}</time></td><td><Link className="control-review-link" href={link({ id: row.id })} aria-label={`${row.name} dosyasını incele`}>İncele <ArrowUpRight size={16} aria-hidden /></Link></td></tr>)}</tbody></table></div>
   </>}
   <nav className="control-pagination" aria-label="Usta sayfaları">{result.page > 1 && <Link className="commerce-secondary" href={link({ page: String(result.page - 1) })}>Önceki</Link>}<span>{result.rows.length === 0 ? "0" : `${(result.page - 1) * result.size + 1}–${Math.min(result.page * result.size, result.total ?? 0)}`} / {result.total} kayıt</span>{result.total !== null && result.page * result.size < result.total && <Link className="commerce-secondary" href={link({ page: String(result.page + 1) })}>Sonraki</Link>}</nav>
  </>}
 </AdminPageShell></AdminAccessGate>;
}
