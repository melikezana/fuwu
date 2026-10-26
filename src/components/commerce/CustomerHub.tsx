import { CustomerSpotlight } from "./CustomerSpotlight";
import { getOrderCardDetails } from "@/services/commerce/order-cards";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, CreditCard, Heart, MapPin, ShieldCheck, ShoppingBag, Star, UserRound } from "lucide-react";
import { getProviderById } from "@/services/providers";
import { ProviderCard } from "@/components/providers/ProviderCard";
import { getServerAuthContext } from "@/services/auth/server";
import { buildLoginRedirectUrl } from "@/lib/constants/navigation";
import { OrderList } from "./OrderList";
import { saveCustomerDetails } from "@/app/account/actions";
import { historyStatuses, serviceActiveStatuses, trackingStatuses } from "@/lib/commerce/order-state";

const views = [["overview", "Genel Bakış"], ["upcoming", "Yaklaşan Randevular"], ["active", "Aktif Hizmetler"], ["history", "Geçmiş Hizmetler"], ["favorites", "Favori Ustalarım"], ["reviews", "Yorumlarım"], ["addresses", "Adreslerim"], ["payments", "Ödeme Yöntemleri"], ["settings", "Hesabım"], ["support", "Destek"]];
export type CustomerHubParams = { view?: string; page?: string; result?: string };
export async function CustomerHub({ params }: { params: CustomerHubParams }) {
  const view = views.some(([id]) => id === params.view) ? params.view! : "overview";
  const { user, supabase, profile } = await getServerAuthContext();
  if (!user || !supabase) redirect(buildLoginRedirectUrl(`/account?view=${view}`));
  const page = Math.min(10000, Math.max(1, Number.parseInt(params.page || "1") || 1));
  const [upcoming, completed, nextAppointment, activeOrder] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("customer_id", user.id).in("status", serviceActiveStatuses),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("customer_id", user.id).eq("status", "COMPLETED"),
    view === "overview" ? supabase.from("orders").select("*").eq("customer_id", user.id).eq("status", "CONFIRMED").gte("starts_at", new Date().toISOString()).order("starts_at").limit(1).maybeSingle() : null,
    view === "overview" ? supabase.from("orders").select("*").eq("customer_id", user.id).in("status", serviceActiveStatuses).order("ends_at").limit(1).maybeSingle() : null,
  ]);
  const unavailable = Boolean(upcoming.error || completed.error || nextAppointment?.error || activeOrder?.error);
  const title = views.find(([id]) => id === view)![1];
  return <div className="commerce-page fusion-customer-hub"><header className="commerce-page-header"><p className="commerce-eyebrow">MY FUWU · HİZMETLERİN TEK YERDE</p><h1>{view === "overview" ? `Merhaba, ${profile?.full_name?.split(" ")[0] || "hoş geldin"}` : title}</h1><p>Satın aldığın hizmetler, randevuların ve hesabın.</p></header><nav className="fusion-tabs" aria-label="Müşteri paneli">{views.map(([id, label]) => <Link key={id} aria-current={view === id ? "page" : undefined} href={`/account?view=${id}`}>{label}</Link>)}<Link href="/orders">Siparişlerim</Link><Link href="/account/notifications">Bildirimler</Link></nav>
    {params.result && <p role="status" className="commerce-notice">{params.result === "saved" ? "Bilgileriniz kaydedildi." : "Bilgiler kaydedilemedi. Alanları ve bağlantınızı kontrol ederek yeniden deneyin."}</p>}
    {view === "overview" && <><div className="fusion-metric-grid"><article><CalendarDays aria-hidden size={22} /><span>Aktif hizmet</span><strong>{unavailable ? "—" : upcoming.count ?? 0}</strong></article><article><ShoppingBag aria-hidden size={22} /><span>Tamamlanan hizmet</span><strong>{unavailable ? "—" : completed.count ?? 0}</strong></article></div>{unavailable && <p role="alert" className="commerce-notice">Sipariş bilgilerine şu anda ulaşılamıyor.</p>}{!unavailable && <CustomerSpotlight upcoming={nextAppointment?.data ?? null} active={activeOrder?.data ?? null} now={new Date().getTime()} />}<div className="fusion-section-heading"><h2>Takip ettiğin siparişler</h2><Link className="commerce-button" href="/services">Yeni Hizmet Seç</Link></div></>}
    {["overview", "upcoming", "active", "history"].includes(view) && <CustomerOrders userId={user.id} history={view === "history"} page={page} view={view} />}
    {view === "addresses" && <CustomerAddresses userId={user.id} />}
    {view === "reviews" && <CustomerReviews userId={user.id} page={page} />}
    {view === "favorites" && <CustomerFavorites userId={user.id} page={page} />}
    {view === "payments" && <section className="commerce-panel"><h2><CreditCard size={22} aria-hidden /> Güvenli Ödeme</h2><p className="commerce-help">Hizmet bedelini ve toplam tutarı sipariş özetinde görürsün. Kart bilgilerini ödeme kuruluşunun güvenli ekranında girersin; FUWU kart numaranı veya güvenlik kodunu saklamaz.</p><p className="commerce-help"><ShieldCheck size={18} aria-hidden /> Kayıtlı kart özelliği henüz sunulmuyor. Her siparişin ödeme ve iade durumunu sipariş detayından takip edebilirsin.</p><p className="commerce-sandbox">Şu an yalnızca iyzico test ortamı kullanılıyor; gerçek para tahsil edilmez.</p><Link className="commerce-button" href="/orders">Ödeme ve Siparişlerimi Gör</Link></section>}
    {view === "support" && <section className="commerce-panel"><h2>Siparişin için buradayız</h2><p className="commerce-help">Bir hizmetle ilgili sorun yaşadıysan sipariş detayından “Sipariş İçin Destek İste” seçeneğini kullan. Sipariş destek incelemesine alınır ve durumunu aynı ekrandan takip edebilirsin.</p><div className="fusion-actions"><Link className="commerce-button" href="/orders">Siparişimi Seç</Link><a className="commerce-secondary" href="mailto:fuwuhizmet@gmail.com">E-posta ile Destek</a></div><p className="commerce-help">İptal: randevu başlamadan ve usta yola çıkmadan sipariş detayından yapılır. Ödenen sipariş, kuruluş iadesi doğrulanana kadar beklemede kalır.</p></section>}
    {view === "settings" && <section className="commerce-panel"><h2><UserRound aria-hidden size={22} /> Hesap bilgilerin</h2><p className="commerce-help">Giriş hesabı: {user.email || "Telefon ile giriş"}</p><form action={saveCustomerDetails} className="fusion-form"><input type="hidden" name="action" value="profile" /><label className="commerce-field">Ad soyad<input name="fullName" autoComplete="name" minLength={2} maxLength={120} required defaultValue={profile?.full_name || ""} /></label><label className="commerce-field">Telefon<input name="phone" autoComplete="tel" type="tel" maxLength={20} defaultValue={profile?.phone || ""} /></label><button className="commerce-button">Bilgilerimi Kaydet</button></form><form action="/api/auth/logout" method="post"><button className="commerce-secondary mt-4">Güvenli Çıkış Yap</button></form></section>}
    <Link className="commerce-text-link" href="/dashboard/requests">Önceki hizmet kayıtlarım →</Link>
  </div>;
}

async function CustomerFavorites({ userId, page }: { userId: string; page: number }) {
  const { supabase } = await getServerAuthContext();
  const { data, error, count } = await supabase!.from("customer_favorite_providers").select("provider_id", { count: "exact" }).eq("customer_id", userId).order("created_at", { ascending: false }).range((page - 1) * 12, page * 12 - 1);
  if (error) return <p role="alert" className="commerce-notice">Favori ustalarına şu anda ulaşılamıyor. Biraz sonra yeniden deneyebilirsin.</p>;
  if (!data?.length) return <section className="commerce-empty"><Heart size={32} aria-hidden /><h2>İyi bir ustayı kaybetme.</h2><p>Usta kartındaki kalbe dokun. Kaydettiğin ustalar burada seni beklesin.</p><Link className="commerce-button" href="/providers">Usta Bul</Link></section>;
  const providers = (await Promise.all(data.map(row => getProviderById(row.provider_id)))).filter((provider): provider is NonNullable<typeof provider> => provider != null);
  return <><div className="favorite-provider-grid">{providers.map(provider => <ProviderCard key={provider.id} provider={provider} />)}</div>{providers.length < data.length && <p className="commerce-help">Bazı kayıtlı profiller şu anda görüntülenemiyor.</p>}<nav className="fusion-pagination" aria-label="Favori usta sayfaları">{page > 1 && <Link href={`?view=favorites&page=${page - 1}`}>← Önceki</Link>}{(count ?? 0) > page * 12 && <Link href={`?view=favorites&page=${page + 1}`}>Sonraki →</Link>}</nav></>;
}

async function CustomerOrders({ userId, history, page, view }: { userId: string; history: boolean; page: number; view: string }) {
  const { supabase } = await getServerAuthContext();
  let query = supabase!.from("orders").select("*", { count: "exact" }).eq("customer_id", userId).order("starts_at", { ascending: !history }).range((page - 1) * 12, page * 12 - 1);
  query = history ? query.in("status", historyStatuses) : query.in("status", view === "upcoming" ? ["CONFIRMED"] : view === "active" ? serviceActiveStatuses : trackingStatuses);
  if (view === "upcoming") query = query.gte("starts_at", new Date().toISOString());
  const { data, error, count } = await query;
  const details = error ? {} : await getOrderCardDetails(supabase!, data ?? []);
  return <><OrderList orders={data ?? []} details={details} unavailable={Boolean(error)} /><nav className="fusion-pagination" aria-label="Hizmet sayfaları">{page > 1 && <Link href={`?view=${view}&page=${page - 1}`}>← Önceki</Link>}{(count ?? 0) > page * 12 && <Link href={`?view=${view}&page=${page + 1}`}>Sonraki →</Link>}</nav></>;
}
async function CustomerAddresses({ userId }: { userId: string }) {
  const { supabase } = await getServerAuthContext();
  const [addresses, districts] = await Promise.all([supabase!.from("customer_addresses").select("*").eq("customer_id", userId).order("created_at", { ascending: false }).limit(100), supabase!.from("districts").select("id,name").eq("is_active", true).order("name")]);
  if (addresses.error || districts.error) return <p role="alert" className="commerce-notice">Adres defteri şu anda kullanılamıyor. Kurulum ve bağlantı kontrol edilmeli. Satın alma sırasında açık adresinizi girebilirsiniz.</p>;
  return <div className="fusion-two-columns"><section className="commerce-panel"><h2><MapPin size={22} aria-hidden /> Kayıtlı adreslerin</h2>{!addresses.data?.length && <p className="commerce-help">Henüz kayıtlı adresin yok.</p>}{addresses.data?.map(address => <article className="fusion-saved-address" key={address.id}><h3>{address.label}</h3><p>{address.address}</p><p className="commerce-help">{districts.data?.find(d => d.id === address.district_id)?.name}, İstanbul</p><form action={saveCustomerDetails}><input type="hidden" name="action" value="delete_address" /><input type="hidden" name="id" value={address.id} /><button className="commerce-secondary">Adresi Sil</button></form></article>)}</section><section className="commerce-panel"><h2>Yeni adres ekle</h2><form className="fusion-form" action={saveCustomerDetails}><input type="hidden" name="action" value="address" /><label className="commerce-field">Adres başlığı<input name="label" placeholder="Örneğin: Evim" required maxLength={60} /></label><label className="commerce-field">İlçe<select name="districtId" required><option value="">İlçe seçin</option>{districts.data?.map(d => <option value={d.id} key={d.id}>{d.name}</option>)}</select></label><label className="commerce-field">Açık adres<textarea name="address" required rows={4} minLength={10} maxLength={1000} autoComplete="street-address" /></label><button className="commerce-button">Adresi Kaydet</button></form></section></div>;
}
async function CustomerReviews({ userId, page }: { userId: string; page: number }) {
  const { supabase } = await getServerAuthContext();
  const { data, error, count } = await supabase!.from("reviews").select("id,order_id,service_request_id,provider_id,rating,comment,created_at", { count: "exact" }).eq("user_id", userId).order("created_at", { ascending: false }).range((page - 1) * 12, page * 12 - 1);
  return <section className="commerce-panel"><h2><Star size={22} aria-hidden /> Değerlendirmelerin</h2>{error ? <p role="alert">Değerlendirmeler okunamadı.</p> : !data?.length ? <p className="commerce-help">Henüz değerlendirmen yok. Tamamlanan hizmetini sipariş detayından değerlendirebilirsin.</p> : data.map(review => <article className="fusion-saved-address" key={review.id}><strong>{review.rating} / 5</strong><p>{review.comment}</p><time dateTime={review.created_at}>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeZone: "Europe/Istanbul" }).format(new Date(review.created_at))}</time><br /><Link className="commerce-text-link" href={review.order_id ? `/orders/${review.order_id}` : `/providers/${review.provider_id}#reviews`}>{review.order_id ? "İlgili siparişi gör" : "Usta profilini gör"} →</Link></article>)}<nav className="fusion-pagination" aria-label="Değerlendirme sayfaları">{page > 1 && <Link href={`/account?view=reviews&page=${page - 1}`}>← Önceki</Link>}{(count ?? 0) > page * 12 && <Link href={`/account?view=reviews&page=${page + 1}`}>Sonraki →</Link>}</nav><Link className="commerce-text-link" href="/account?view=history">Tamamlanan Hizmetlerimi Gör →</Link></section>;
}
