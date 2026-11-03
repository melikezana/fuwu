import Link from "next/link";
import { LinkPending } from "@/components/ui/LinkPending";

const accountLinks = [["favorites", "Favori ustaların"], ["addresses", "Adreslerin"], ["reviews", "Yorumların"], ["payments", "Ödeme bilgileri"], ["settings", "Hesap bilgileri"], ["support", "Destek"]];
export function CustomerNavigation({ view }: { view: string }) {
  return <nav className="customer-hub-navigation" aria-label="Müşteri paneli">
    <div className="customer-primary-links"><Link href="/account" aria-current={view === "overview" ? "page" : undefined}>İşlerim<LinkPending /></Link><Link href="/orders">Siparişlerim<LinkPending /></Link><Link href="/account?view=history" aria-current={view === "history" ? "page" : undefined}>Yeniden Satın Al<LinkPending /></Link></div>
    <details className="customer-account-menu" open={accountLinks.some(([id]) => id === view)}><summary>Hesap ve destek</summary><div>{accountLinks.map(([id, label]) => <Link href={`/account?view=${id}`} aria-current={view === id ? "page" : undefined} key={id}>{label}<LinkPending /></Link>)}<Link href="/account/notifications">Bildirimler</Link><Link href="/dashboard/requests">Önceki hizmet kayıtları</Link></div></details>
  </nav>;
}
