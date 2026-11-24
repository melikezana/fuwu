// Ön Bilgilendirme Formu ve Mesafeli Hizmet Sözleşmesi tek kaynaktan üretilir: ödeme adımında gösterilen metin,
// sipariş belgeleri sayfası ve herkese açık örnek metin aynı fonksiyonlardan gelir. Metin değişirse sürüm de değişmeli;
// veritabanı (commerce_place_order) yalnızca bu sürümle verilen siparişi kabul eder.
//
// Dayanak: 6502 s. Tüketicinin Korunması Hakkında Kanun m.48, 73/A; Mesafeli Sözleşmeler Yönetmeliği m.5 (ön bilgilendirme
// içeriği), m.6 (yöntem: en az 12 punto, ödeme yükümlülüğünden hemen önce), m.7 (teyit), m.8 (ödeme yükümlülüğü bildirimi),
// m.9-12 (cayma), m.15/1-h (onayla ifasına başlanan hizmet) ve Ek (cayma formu). Aracı hizmet sağlayıcı ön bilgilendirmeden
// ve cayma bildirim sisteminden usta ile birlikte sorumludur (m.5/7, m.6/6, m.11/5).

export const DISTANCE_CONTRACT_VERSION = "mesafeli-hizmet-2026-11-24";
export const WITHDRAWAL_DAYS = 14;
const PENDING = "[siparişte doldurulur]";

export type LegalParty = {
  name: string | null; display_name?: string | null; tax_id: string | null; tax_office: string | null;
  mersis?: string | null; address: string | null; phone: string | null; email?: string | null; ready?: boolean;
};
export type LegalSection = { title: string; body: string[] };
export type ContractInput = {
  orderRef?: string | null; acceptedAt?: string | null; version?: string | null;
  provider: LegalParty | null; intermediary: LegalParty | null;
  customer?: { name?: string | null; email?: string | null } | null;
  service: { name: string; variant?: string | null; scope: string; exclusions?: string | null } | null;
  addons: { name: string; quantity: number; total_minor: number }[];
  basePriceMinor: number | null; addonsMinor: number; totalMinor: number | null;
  durationMinutes?: number | null; startsAt?: string | null; address?: string | null; district?: string | null;
  paymentMethod: "PAY_AT_DOOR" | "CARD" | null; withinWithdrawalPeriod: boolean | null; earlyStartConsentAt?: string | null;
};

const money = (minor: number | null | undefined) => minor == null ? PENDING : new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: minor % 100 ? 2 : 0 }).format(minor / 100);
const when = (iso: string | null | undefined) => iso ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(new Date(iso)) : PENDING;
const value = (text: string | null | undefined) => text?.trim() || PENDING;

/** Bir tarafın kimlik ve iletişim satırları (Yön. m.5/1-b,c). */
export function partyLines(party: LegalParty | null, role: string): string[] {
  const identity = party?.mersis ? `MERSİS no: ${party.mersis}` : `Vergi kimlik no: ${value(party?.tax_id)}${party?.tax_office ? ` (${party.tax_office} V.D.)` : ""}`;
  return [
    `${role}: ${value(party?.name)}${party?.display_name && party.display_name !== party.name ? ` (FUWU'daki adı: ${party.display_name})` : ""}`,
    identity,
    `Açık adres: ${value(party?.address)}`,
    `Telefon: ${value(party?.phone)}${party?.email ? ` · E-posta: ${party.email}` : ""}`,
  ];
}

/** Randevu cayma süresi içinde mi? (Sözleşme sipariş anında kurulur; süre o gün başlar, Yön. m.9/2.) */
export function startsWithinWithdrawalPeriod(startsAt: string, orderedAt = Date.now()): boolean {
  return Date.parse(startsAt) < orderedAt + WITHDRAWAL_DAYS * 24 * 60 * 60 * 1000;
}

function serviceLines(d: ContractInput): string[] {
  const lines = [
    `Hizmet: ${value(d.service?.name)}${d.service?.variant ? ` · Paket: ${d.service.variant}` : ""}`,
    `Kapsam (hizmete dahil olanlar): ${value(d.service?.scope)}`,
    `Dahil olmayanlar: ${d.service ? d.service.exclusions?.trim() || "Kapsamda yazmayan iş ve malzeme." : PENDING}`,
  ];
  if (d.addons.length) lines.push(`Ekstralar: ${d.addons.map(item => `${item.name}${item.quantity > 1 ? ` × ${item.quantity}` : ""} (${money(item.total_minor)})`).join("; ")}`);
  lines.push(`Hizmet süresi: ${d.durationMinutes ? `yaklaşık ${d.durationMinutes} dakika` : PENDING} · Randevu: ${when(d.startsAt)} (Türkiye saati)`);
  lines.push(`Hizmet adresi: ${d.address ? `${d.address}${d.district ? `, ${d.district}, İstanbul` : ""}` : PENDING}`);
  return lines;
}

function priceLines(d: ContractInput): string[] {
  const lines = [
    `Paket bedeli: ${money(d.basePriceMinor)}${d.addons.length ? ` · Ekstralar: ${money(d.addonsMinor)}` : ""}`,
    `Toplam: ${money(d.totalMinor)} (tüm vergiler ve FUWU hizmet bedeli dahil).`,
    "Bu tutar dışında ulaşım, servis, keşif veya benzeri bir ek masraf alınmaz. Kapsam dışı bir iş ya da malzeme gerekirse usta önce yazılı olarak fiyat bildirir; sen uygulamada onaylamadıkça ek ücret ödemezsin.",
  ];
  if (d.paymentMethod === "CARD") lines.push("Ödeme yöntemi: Online kart. Kart bilgilerin iyzico'nun güvenli ödeme ekranına girilir; FUWU kart bilgisi saklamaz.");
  else if (d.paymentMethod === "PAY_AT_DOOR") lines.push("Ödeme yöntemi: Kapıda ödeme. Toplam tutar, hizmet tamamlandıktan sonra doğrudan ustaya ödenir. Usta hizmete başlamadan ödeme isteyemez ve bu tutarın üstünde ücret talep edemez. FUWU bu ödemeyi tahsil etmez.");
  else lines.push("Ödeme yöntemi: Siparişte seçilir (kapıda ödeme ya da sunulduğunda online kart).");
  return lines;
}

function withdrawalLines(d: ContractInput, intermediaryEmail: string): string[] {
  return [
    `Siparişi onayladığın gün başlayan ${WITHDRAWAL_DAYS} gün içinde hiçbir gerekçe göstermeden ve cezai şart ödemeden sözleşmeden cayabilirsin.`,
    `Cayma bildirimini sipariş sayfandaki "Siparişi İptal Et" düğmesiyle ya da ekteki cayma formunu veya açık bir yazılı beyanı ${intermediaryEmail} adresine göndererek yapabilirsin. Bildirimin ustaya ve FUWU'ya ulaştığı sana derhâl teyit edilir.`,
    d.paymentMethod === "CARD"
      ? "Kartla ödenmiş bir siparişten caydığında ödediğin tüm tutar, bildirimin ulaşmasından itibaren 14 gün içinde, ödediğin araçla ve sana masraf yüklenmeden tek seferde iade edilir."
      : "Kapıda ödemeli siparişte hizmet öncesi ödeme yapılmadığı için iade gerekmez; caymanın sana hiçbir maliyeti yoktur.",
  ];
}

function exceptionLines(d: ContractInput): string[] {
  const rule = "Cayma süresi dolmadan, tüketicinin onayıyla ifasına başlanan hizmetlerde cayma hakkı kullanılamaz (Mesafeli Sözleşmeler Yönetmeliği m.15/1-h).";
  if (d.withinWithdrawalPeriod === true) return [rule, `Randevun cayma süresi içinde olduğundan, hizmetin bu randevuda başlamasını açıkça onaylarsın${d.earlyStartConsentAt ? ` (onay zamanı: ${when(d.earlyStartConsentAt)})` : ""}. Usta hizmete başladığı anda cayma hakkın sona erer; o ana kadar ücretsiz vazgeçebilirsin.`];
  if (d.withinWithdrawalPeriod === false) return [rule, "Randevun cayma süresinden sonra olduğu için cayma süresinin tamamında ücretsiz vazgeçebilirsin; cayma süresi bittikten sonra da hizmete başlanana kadar ücretsiz iptal hakkın sürer."];
  return [rule, "Randevu cayma süresi içindeyse sipariş adımında bu onay ayrıca istenir; usta hizmete başladığı anda cayma hakkı sona erer. Hizmete başlanana kadar ücretsiz vazgeçebilirsin."];
}

function disputeLines(intermediaryEmail: string): string[] {
  return [
    `Şikâyet ve taleplerini sipariş sayfandaki "Destek İste" bölümünden ya da ${intermediaryEmail} adresinden iletebilirsin.`,
    "Uyuşmazlıklarda, Ticaret Bakanlığınca her yıl ilan edilen parasal sınırlar içinde yerleşim yerindeki veya tüketici işleminin yapıldığı yerdeki Tüketici Hakem Heyetine; bu sınırları aşan uyuşmazlıklarda 6502 sayılı Kanun'un 73/A maddesi uyarınca zorunlu arabuluculuğa başvurduktan sonra Tüketici Mahkemesine başvurabilirsin.",
  ];
}

/** Ön Bilgilendirme Formu (Mesafeli Sözleşmeler Yönetmeliği m.5). */
export function preInformationSections(d: ContractInput): LegalSection[] {
  const email = d.intermediary?.email?.trim() || PENDING;
  return [
    { title: "1. Taraflar", body: [
      ...partyLines(d.provider, "Hizmeti sunan (sağlayıcı)"),
      ...partyLines(d.intermediary, "Aracı hizmet sağlayıcı (platform)"),
      "Sözleşmenin tarafları sen ve hizmeti sunan ustadır. FUWU, sözleşmenin kurulmasına aracılık eden aracı hizmet sağlayıcıdır ve mevzuatın öngördüğü hâllerde ustayla birlikte sorumludur.",
    ] },
    { title: "2. Hizmetin temel nitelikleri", body: serviceLines(d) },
    { title: "3. Toplam fiyat ve ödeme", body: priceLines(d) },
    { title: "4. Hizmetin ifası", body: [
      "Hizmet, seçtiğin gün ve saatte, yazdığın adreste verilir. Usta geldiğinde kimliğini sipariş sayfandaki fotoğraf ve adla karşılaştırırsın; hizmet senin vereceğin 6 haneli kodla başlar.",
      "Usta gecikirse ya da gelmezse sipariş sayfandan bildirirsin ve ücretsiz iptal edebilirsin. Bu sipariş, hizmetin elektronik ortamda satışından başka bir teslim kısıtı içermez.",
    ] },
    { title: "5. Cayma hakkı", body: withdrawalLines(d, email) },
    { title: "6. Cayma hakkının kullanılamayacağı durum", body: exceptionLines(d) },
    { title: "7. Teminat", body: ["Ne usta ne de FUWU senden depozito, kapora veya başka bir teminat isteyebilir."] },
    { title: "8. Şikâyet ve uyuşmazlık", body: disputeLines(email) },
    { title: "9. Kişisel veriler ve diğer hususlar", body: [
      "Siparişin için gereken bilgiler (adın, adresin, randevun ve notun) yalnızca hizmeti sunacak ustayla paylaşılır. Ayrıntılar KVKK Aydınlatma Metni'ndedir (fuwu.com.tr/kvkk).",
      "Bu ön bilgiler sözleşmenin ayrılmaz parçasıdır; taraflar açıkça anlaşmadıkça değiştirilemez. Ön bilgilendirmenin yapıldığını gösteren kayıt (metin sürümü, onay zamanı ve taraf bilgileri) siparişinde saklanır.",
      "\"Siparişi Onayla\" düğmesine bastığında ödeme yükümlülüğü doğan bir sipariş vermiş olursun.",
    ] },
  ];
}

/** Mesafeli Hizmet Sözleşmesi (6502 s. Kanun m.48). */
export function distanceContractSections(d: ContractInput): LegalSection[] {
  const email = d.intermediary?.email?.trim() || PENDING;
  const customer = d.customer?.name || d.customer?.email ? `${d.customer?.name?.trim() || "FUWU hesabı sahibi"}${d.customer?.email ? ` (${d.customer.email})` : ""}` : "Siparişi veren FUWU hesabı sahibi";
  return [
    { title: "Madde 1 – Taraflar", body: [
      ...partyLines(d.provider, "Hizmet sağlayıcı (Usta)"),
      `Tüketici (bu sözleşmede "sen"): ${customer}`,
      ...partyLines(d.intermediary, "Aracı hizmet sağlayıcı (FUWU)"),
    ] },
    { title: "Madde 2 – Konu", body: [
      "Bu sözleşme, FUWU platformu üzerinden elektronik ortamda satın aldığın ev hizmetinin Usta tarafından ifasına ilişkin tarafların hak ve yükümlülüklerini, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümlerine göre düzenler.",
      "Ön Bilgilendirme Formu bu sözleşmenin ayrılmaz parçasıdır.",
    ] },
    { title: "Madde 3 – Hizmet, bedel ve ödeme", body: [...serviceLines(d), ...priceLines(d)] },
    { title: "Madde 4 – İfa", body: [
      "Usta hizmeti, siparişte belirtilen gün, saat ve adreste, kapsamına ve mevzuata uygun, özenli biçimde ifa eder; gecikme ihtimalini sana uygulama üzerinden derhâl bildirir.",
      "Hizmet adresine erişimi sen sağlarsın ve siparişteki bilgilerin doğruluğundan sorumlusun. Hizmet, senin vereceğin 6 haneli kodla başlar ve senin onayınla tamamlanır.",
    ] },
    { title: "Madde 5 – Ek iş ve fiyat değişikliği", body: [
      "Kapsam dışı bir iş veya malzeme gerekirse Usta önce kapsamı ve bedeli uygulama üzerinden bildirir. Sen açıkça onaylamadıkça ek iş yapılmaz ve ek ücret istenmez; onay vermemen satın aldığın hizmeti etkilemez.",
    ] },
    { title: "Madde 6 – Cayma hakkı", body: withdrawalLines(d, email) },
    { title: "Madde 7 – Cayma hakkının istisnası", body: exceptionLines(d) },
    { title: "Madde 8 – Ayıplı hizmet", body: [
      "Hizmet sözleşmeye veya kapsamına uygun ifa edilmezse 6502 sayılı Kanun'un 15. maddesi uyarınca hizmetin yeniden görülmesini, hizmet sonucu ortaya çıkan eserin ücretsiz onarımını, ayıp oranında bedelden indirim yapılmasını ya da sözleşmeden dönmeyi seçebilirsin.",
      "Talebini sipariş sayfandaki \"Destek İste\" bölümünden iletirsin; iş tamamlanmadıysa tamamlanma onayı vermez ve kapıda ödeme yapmazsın.",
    ] },
    { title: "Madde 9 – FUWU'nun rolü", body: [
      "FUWU, sözleşmenin kurulmasına aracılık eden aracı hizmet sağlayıcıdır: platformu işletir, ön bilgilendirmeyi ve sipariş kayıtlarını tutar, cayma ve şikâyet bildirimleri için sistemi açık tutar ve bildirimleri Ustaya iletir.",
      "FUWU, mevzuatın aracı hizmet sağlayıcıya yüklediği yükümlülüklerden Usta ile birlikte sorumludur. Kapıda ödemeli siparişte hizmet bedeli doğrudan Ustaya ödenir; FUWU bu bedeli tahsil etmez.",
    ] },
    { title: "Madde 10 – Uyuşmazlık", body: disputeLines(email) },
    { title: "Madde 11 – Yürürlük ve kayıt", body: [
      `Bu sözleşme, sipariş adımında Ön Bilgilendirme Formunu okuduğunu teyit edip siparişi onayladığın anda elektronik ortamda kurulur${d.acceptedAt ? ` (onay zamanı: ${when(d.acceptedAt)})` : ""}.`,
      `Metin sürümü: ${d.version || DISTANCE_CONTRACT_VERSION}${d.orderRef ? ` · Sipariş no: ${d.orderRef}` : ""}. Onay zamanı, metin sürümü ve taraf bilgileri siparişte değiştirilemez biçimde saklanır; sözleşmeye sipariş sayfandan her zaman ulaşabilir, yazdırabilir veya PDF olarak kaydedebilirsin.`,
    ] },
  ];
}

/** Mesafeli Sözleşmeler Yönetmeliği Ek'indeki örnek cayma formu. */
export function withdrawalFormSection(d: Pick<ContractInput, "provider" | "intermediary" | "service" | "orderRef" | "acceptedAt">): LegalSection {
  return { title: "Ek – Cayma Formu", body: [
    "Bu formu yalnızca sözleşmeden caymak istersen doldurup gönder. Sipariş sayfandaki \"Siparişi İptal Et\" düğmesi de cayma bildirimi yerine geçer.",
    `Kime: ${value(d.provider?.name)}, ${value(d.provider?.address)} ve aracı hizmet sağlayıcı ${value(d.intermediary?.name)}, ${value(d.intermediary?.email)}`,
    `Bu formla aşağıdaki hizmetin satışına ilişkin sözleşmeden cayma hakkımı kullandığımı bildiririm. Hizmet: ${value(d.service?.name)} · Sipariş no: ${value(d.orderRef)} · Sipariş tarihi: ${when(d.acceptedAt)}`,
    "Tüketicinin adı soyadı: ……… · Adresi: ……… · İmzası (yalnızca kâğıt üzerinde gönderiliyorsa): ……… · Tarih: ………",
  ] };
}
