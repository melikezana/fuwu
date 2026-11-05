import Link from "next/link";
import { Mail } from "lucide-react";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { AdminEmptyState, AdminPageShell } from "@/components/admin/AdminUI";
import { getAdminAccess } from "@/services/admin";
import { getAdminSupportInbox, SUPPORT_STATUS_LABELS, SUPPORT_STATUSES, type AdminSupportMessage } from "@/services/admin/support";
import { updateSupportMessageAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Destek Mesajları | Admin" };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(new Date(value));
}

function filterHref(status?: string, page?: number) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return `/admin/support${query ? `?${query}` : ""}`;
}

function MessageCard({ row }: { row: AdminSupportMessage }) {
  const replyHref = `mailto:${row.email}?subject=${encodeURIComponent(`Re: ${row.subject}`)}`;
  return (
    <article className="commerce-panel">
      <header className="fusion-section-heading">
        <div>
          <p className="commerce-eyebrow">{SUPPORT_STATUS_LABELS[row.status]} · {formatDate(row.createdAt)}{row.userId ? " · Üye" : " · Ziyaretçi"}</p>
          <h2>{row.subject}</h2>
          <p className="commerce-help">{row.email}{row.userId ? <> · <Link href={`/admin/users/${row.userId}`}>Kullanıcıyı gör</Link></> : null}</p>
        </div>
        <a className="commerce-secondary" href={replyHref}><Mail aria-hidden size={16} /> E-postayla yanıtla</a>
      </header>
      <p className="whitespace-pre-line">{row.message}</p>
      {row.resolvedAt ? <p className="commerce-help mt-2">Çözüldü: {formatDate(row.resolvedAt)}</p> : null}
      <form action={updateSupportMessageAction} className="fusion-form mt-4">
        <input name="id" type="hidden" value={row.id} />
        <label className="commerce-field">İç not (müşteri görmez)
          <textarea defaultValue={row.adminNote ?? ""} maxLength={2000} name="note" rows={2} />
        </label>
        <div className="fusion-actions">
          {SUPPORT_STATUSES.map(status => (
            <button className={status === "resolved" ? "commerce-button" : "commerce-secondary"} key={status} name="status" type="submit" value={status}>
              {status === row.status ? `Notu kaydet (${SUPPORT_STATUS_LABELS[status]})` : status === "new" ? "Yeniye al" : status === "read" ? "İnceleniyor yap" : "Çözüldü yap"}
            </button>
          ))}
        </div>
      </form>
    </article>
  );
}

export default async function AdminSupportPage({ searchParams }: { searchParams: Promise<{ page?: string; status?: string }> }) {
  const access = await getAdminAccess();
  if (!access.ok) return <AdminAccessGate access={access} />;
  const params = await searchParams;
  const status = SUPPORT_STATUSES.includes(params.status as never) ? params.status : undefined;
  const inbox = await getAdminSupportInbox({ page: Number(params.page) || 1, status });
  const totalPages = Math.max(1, Math.ceil(inbox.total / inbox.pageSize));

  return (
    <AdminAccessGate access={access}>
      <AdminPageShell active="support" breadcrumbLabel="Destek Mesajları" description="İletişim formu ve asistandan gelen mesajlar. Yanıtı e-postayla ver, durumu buradan işaretle." error={inbox.error} title="Destek Mesajları">
        <nav aria-label="Durum filtresi" className="catalog-category-nav mb-6">
          <Link aria-current={!status ? "page" : undefined} href={filterHref()}>Tümü ({inbox.counts.new + inbox.counts.read + inbox.counts.resolved})</Link>
          {SUPPORT_STATUSES.map(item => <Link aria-current={status === item ? "page" : undefined} href={filterHref(item)} key={item}>{SUPPORT_STATUS_LABELS[item]} ({inbox.counts[item]})</Link>)}
        </nav>
        {!inbox.error && inbox.rows.length === 0 ? (
          <AdminEmptyState title="Mesaj yok">{status ? "Bu durumda mesaj bulunmuyor." : "Henüz destek mesajı gelmedi."}</AdminEmptyState>
        ) : (
          <div className="grid gap-4">{inbox.rows.map(row => <MessageCard key={row.id} row={row} />)}</div>
        )}
        {totalPages > 1 ? (
          <nav aria-label="Sayfalar" className="fusion-pagination">
            {inbox.page > 1 ? <Link href={filterHref(status, inbox.page - 1)}>← Önceki</Link> : null}
            <span>{inbox.page} / {totalPages}</span>
            {inbox.page < totalPages ? <Link href={filterHref(status, inbox.page + 1)}>Sonraki →</Link> : null}
          </nav>
        ) : null}
      </AdminPageShell>
    </AdminAccessGate>
  );
}
