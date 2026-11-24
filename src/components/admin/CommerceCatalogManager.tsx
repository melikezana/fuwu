import { getServerAuthContext } from "@/services/auth/server";
import { servicePhotos } from "@/lib/service-photos";
import type { CatalogService, ServiceAddon, ServiceVariant } from "@/lib/commerce/types";
import { saveCommerceService, saveServiceAddon } from "@/app/admin/catalog/commerce-actions";
import { money } from "@/lib/commerce/display";

export async function CommerceCatalogManager() {
  const { supabase } = await getServerAuthContext();
  if (!supabase) return null;
  const [services, categories, variants, addonRows] = await Promise.all([supabase.from("service_catalog").select("*").order("name"), supabase.from("service_categories").select("id,name").eq("is_active", true).order("name"), supabase.from("service_variants").select("*"), supabase.from("service_addons").select("*").order("sort_order")]);
  // Ekstra tablosu yoksa (migrasyon uygulanmadıysa) ürün yönetimi çalışmaya devam eder.
  const addons = addonRows.error ? null : (addonRows.data as ServiceAddon[]);
  if (services.error || categories.error || variants.error) return <section className="commerce-panel"><h2>Satın alınabilir hizmetler</h2><p className="commerce-notice" role="status">Hizmet ürünleri okunamadı. Commerce migration ve bağlantı kontrol edilmeli.</p></section>;
  const all: (CatalogService | null)[] = [...services.data, null];
  return <section className="commerce-panel mb-6"><h2>Hizmet ürünleri ve paketler</h2><p className="commerce-help">Ürün kapsamını burada, satış fiyatı ve takvimi usta mağazasında yönetin. Ürün açmak tek başına satış başlatmaz. Aktif satış kaydı olan ürünün kategorisi ve fiyatlandırma türü değiştirilemez; ayrı bir ürün oluşturun. Kaldırılan paketlerin satış kayıtları satışa kapanır; geçmiş siparişler korunur.</p><div className="grid gap-4 mt-4">{all.map(service => <details className="fusion-saved-address" key={service?.id || "new"}><summary className="cursor-pointer min-h-11 font-semibold">{service ? `${service.name} · ${service.is_active ? "Aktif" : "Pasif"}` : "+ Yeni hizmet ürünü"}</summary><CatalogForm service={service} categories={categories.data} variants={variants.data} />{service && <AddonEditor service={service} addons={addons} />}</details>)}</div></section>;
}
function CatalogForm({ service, categories, variants }: { service: CatalogService | null; categories: { id: string; name: string }[]; variants: ServiceVariant[] }) {
  return <form action={saveCommerceService} className="fusion-form mt-4"><input type="hidden" name="id" value={service?.id || ""} /><div className="fusion-catalog-fields"><label className="commerce-field">Hizmet adı<input name="name" required minLength={3} maxLength={120} defaultValue={service?.name} /></label><label className="commerce-field">URL adı<input name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" required maxLength={100} defaultValue={service?.slug} /></label><label className="commerce-field">Kategori<select name="category_id" defaultValue={service?.category_id} required>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="commerce-field">Fiyatlandırma<select name="pricing_type" defaultValue={service?.pricing_type || "FIXED_PRICE"}><option value="FIXED_PRICE">Sabit fiyat</option><option value="VARIANT_BASED">Paket / varyant</option><option value="DIAGNOSTIC_SERVICE">Keşif / arıza tespiti</option></select></label><label className="commerce-field fusion-wide">Kısa açıklama<textarea name="description" required minLength={10} maxLength={4000} rows={2} defaultValue={service?.description} /></label><label className="commerce-field fusion-wide">Dahil olan işlemler<textarea name="scope" required minLength={10} maxLength={4000} rows={3} defaultValue={service?.scope} /></label><label className="commerce-field fusion-wide">Dahil olmayanlar<textarea name="exclusions" maxLength={4000} rows={2} defaultValue={service?.exclusions} /></label><label className="commerce-field fusion-wide">Lisans kaydı bulunan hizmet fotoğrafı<select name="image_url" defaultValue={service?.image_url}>{Array.from(new Map(Object.values(servicePhotos).map(photo => [photo.src, photo])).values()).map(photo => <option key={photo.src} value={photo.src}>{photo.alt}</option>)}</select></label><label className="commerce-field fusion-wide">Hizmet paketleri · Her satıra bir paket<textarea name="variants" maxLength={1600} rows={3} defaultValue={variants.filter(variant => variant.service_id === service?.id && variant.is_active).map(variant => variant.name).join("\n")} placeholder="Örneğin: 1 klima" /></label></div><label className="commerce-checkbox"><input type="checkbox" name="is_active" defaultChecked={service?.is_active ?? false} /> Katalogda aktif</label><button className="commerce-button">Hizmet Ürününü Kaydet</button></form>;
}

function AddonFields({ service, addon }: { service: CatalogService; addon?: ServiceAddon }) {
  return <form action={saveServiceAddon} className="fusion-form mt-3"><input type="hidden" name="service_id" value={service.id} /><div className="fusion-catalog-fields">
    <label className="commerce-field">Ekstra adı<input name="name" required minLength={3} maxLength={80} defaultValue={addon?.name} /></label>
    <label className="commerce-field">Kısa kod<input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={60} defaultValue={addon?.slug} readOnly={Boolean(addon)} /></label>
    <label className="commerce-field">Fiyat (TL, işçilik)<input name="price" required inputMode="decimal" pattern="[0-9]{1,6}([.,][0-9]{1,2})?" defaultValue={addon ? String(addon.price_minor / 100).replace(".", ",") : ""} /></label>
    <label className="commerce-field">En fazla adet<input name="max_quantity" type="number" min={1} max={20} required defaultValue={addon?.max_quantity ?? 1} /></label>
    <label className="commerce-field">Sıra<input name="sort_order" type="number" min={0} max={10000} defaultValue={addon?.sort_order ?? 100} /></label>
  </div><label className="commerce-field">Açıklama (dahil olanlar ve sınırlar)<textarea name="description" maxLength={240} rows={2} defaultValue={addon?.description ?? ""} /></label>
  <label className="commerce-checkbox"><input type="checkbox" name="is_active" defaultChecked={addon ? addon.is_active : true} /> Müşteriye göster</label>
  <button className="commerce-secondary" type="submit">{addon ? "Ekstrayı Kaydet" : "Ekstra Ekle"}</button></form>;
}
function AddonEditor({ service, addons }: { service: CatalogService; addons: ServiceAddon[] | null }) {
  if (!addons) return <p className="commerce-help mt-4">Ekstralar okunamadı. Doğrudan satın alma migrasyonu uygulanmış olmalı.</p>;
  const own = addons.filter(addon => addon.service_id === service.id);
  return <section className="mt-6"><h3>Ekstralar (sepete eklenen ek işler)</h3><p className="commerce-help">Müşteri paketin yanında bu ekstraları seçer; fiyat siparişe sabitlenir. Fiyat değişikliği yalnızca yeni siparişleri etkiler ve audit kaydı bırakır. Kısa kod sonradan değiştirilemez; kaldırmak için “Müşteriye göster”i kapatın.</p>
    {own.map(addon => <details className="fusion-saved-address mt-2" key={addon.id}><summary className="cursor-pointer min-h-11">{addon.name} · {money(addon.price_minor)}{addon.max_quantity > 1 ? ` · en fazla ${addon.max_quantity}` : ""} · {addon.is_active ? "Görünür" : "Gizli"}</summary><AddonFields service={service} addon={addon} /></details>)}
    <details className="fusion-saved-address mt-2"><summary className="cursor-pointer min-h-11 font-semibold">+ Yeni ekstra</summary><AddonFields service={service} /></details></section>;
}
