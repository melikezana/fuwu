/**
 * İş kiti — bir siparişin türünü tanır ve iki tarafa da işe yarayan, elle yazılmış rehberleri üretir:
 *
 * - Müşteri: "Usta gelmeden önce" hazırlık listesi (işin süresini kısaltır, sürpriz masrafı azaltır).
 * - Usta: "Çantana koy" listesi ve kapıda sorulacaklar (ikinci geliş / malzeme almaya gitme olmasın).
 * - Ev Karnesi: aynı türdeki işin ne zaman yeniden gündeme gelebileceğine dair genel bir öneri.
 *
 * Kişisel veri tutmaz, ağ çağrısı yapmaz, yapay zekâ çağırmaz. İçerik bir rehberdir; garanti ya da
 * teknik talimat değildir ve ekranda böyle sunulur.
 */

export type JobKind =
  | "temizlik" | "hali" | "tesisat" | "elektrik" | "boya" | "cilingir" | "klima"
  | "montaj" | "nakliye" | "bahce" | "havuz" | "tadilat" | "genel";

export type PrepItem = { id: string; title: string; why: string };
export type ProviderKit = { bring: string[]; askAtDoor: string[]; safety: string[] };
type KindGuide = { label: string; customer: PrepItem[]; provider: ProviderKit; revisitMonths: number | null };

const normalize = (value: string) => value.toLocaleLowerCase("tr-TR")
  .replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c");

// Sıra önemlidir: daha özel kalıp önce gelir ("koltuk yıkama" temizlikten önce halı/koltuk sayılır).
const patterns: [JobKind, RegExp][] = [
  ["hali", /\b(hali|koltuk yika|koltuk temiz)/],
  ["cilingir", /(cilingir|kapi acma|kilit|barel)/],
  ["klima", /(klima|beyaz esya|buzdolabi|camasir makine|bulasik makine|kombi)/],
  ["havuz", /havuz/],
  ["bahce", /(bahce|cim|cit|budama|peyzaj)/],
  ["nakliye", /(nakliy|tasima|tasinma|esya tas)/],
  ["montaj", /(montaj|kurulum|dolap kur|tv ask|mobilya)/],
  ["boya", /(boya|badana|alci|macun)/],
  ["elektrik", /(elektrik|priz|sigorta|aydinlatma|avize|anahtar degis|kablo)/],
  ["tesisat", /(tesisat|musluk|batarya|gider|tikanik|petek|kalorifer|su kacag|sizinti|klozet|rezervuar|lavabo)/],
  ["tadilat", /(tadilat|fayans|seramik|parke|silikon|yalitim|izolasyon)/],
  ["temizlik", /(temizlik|temizlig)/],
];

/**
 * İşin türünü çıkarır. Metinler öncelik sırasıyla tek tek denenir (önce hizmet adı, sonra paket,
 * sonra kapsam): kapsam metni "iş sonu kaba temizlik" gibi başka türlere ait kelimeler içerebilir,
 * bu yüzden yalnızca ad bir şey söylemiyorsa ona bakılır. Eşleşme yoksa "genel".
 */
export function classifyJob(...texts: (string | null | undefined)[]): JobKind {
  for (const text of texts) {
    if (!text) continue;
    const haystack = normalize(text);
    for (const [kind, pattern] of patterns) if (pattern.test(haystack)) return kind;
  }
  return "genel";
}

const p = (id: string, title: string, why: string): PrepItem => ({ id, title, why });

const commonCustomer: PrepItem[] = [
  p("access", "Bina girişini ve otoparkı kolaylaştır", "Kapı kodu, kat ve park yeri bilgisini mesajla paylaşırsan usta kapıda vakit kaybetmez."),
  p("pets", "Evcil hayvanını ayrı bir odaya al", "Kapı sık açılıp kapanacak; hem hayvanın hem ustanın güvenliği için."),
];

const guides: Record<JobKind, KindGuide> = {
  temizlik: {
    label: "Temizlik",
    revisitMonths: 3,
    customer: [
      p("valuables", "Değerli ve kırılacak eşyaları kaldır", "Takı, belge ve hassas objeler ortada kalmasın; temizlik hızlanır, kayıp tartışması olmaz."),
      p("priorities", "Öncelikli alanları not et", "Süre sınırlıdır; en çok önem verdiğin oda ya da yüzey başta yapılsın."),
      p("products", "Özel yüzeyler için ürün bırak", "Mermer, ahşap ya da parke için kullandığın özel bir temizleyici varsa görünür bir yere koy."),
    ],
    provider: { bring: ["Mikrofiber bez seti (renk kodlu)", "Yüzeye uygun temizleyiciler", "Kireç çözücü", "Eldiven", "Yedek paspas başlığı"], askAtDoor: ["Öncelikli oda hangisi?", "Kullanılmaması gereken ürün ya da hassas yüzey var mı?"], safety: ["Çamaşır suyu ile asidik ürünleri asla karıştırma."] },
  },
  hali: {
    label: "Halı ve koltuk",
    revisitMonths: 12,
    customer: [
      p("clear-floor", "Halının üstündeki eşyaları kaldır", "Sehpa ve küçük mobilyalar kalkarsa teslim alma ya da yıkama dakikalar içinde başlar."),
      p("stains", "Lekeli bölgeleri işaretle", "Hangi lekenin ne olduğunu (kahve, mürekkep, evcil hayvan) bilmek doğru ön işlemi seçtirir."),
      p("fabric-label", "Koltuk kumaş etiketine bak", "Deri, süet ya da 'kuru temizleme' etiketi varsa yerinde yıkama kapsam dışıdır; baştan söyle."),
    ],
    provider: { bring: ["Vakumlu yıkama makinesi", "Leke ön işlem ürünleri", "Koruyucu örtü", "Nem ölçer"], askAtDoor: ["Kumaş etiketi ne yazıyor?", "Kalıcı leke olabilecek bölge var mı?"], safety: ["Kalıcı leke ve renk garantisi kapsam dışıdır; işe başlamadan müşteriye söyle."] },
  },
  tesisat: {
    label: "Tesisat",
    revisitMonths: 12,
    customer: [
      p("main-valve", "Ana su vanasının yerini bul", "Acil bir durumda ve iş sırasında suyun hızla kesilmesi gerekebilir."),
      p("under-sink", "Lavabo ve tezgâh altını boşalt", "Usta borulara doğrudan ulaşır; temizlik malzemelerin ıslanmaz."),
      p("photo-problem", "Sorunun fotoğrafını mesajla gönder", "Usta doğru parçayı yanında getirir; ikinci geliş gerekmez."),
    ],
    provider: { bring: ["Boru ve ayarlı anahtar", "Teflon bant ve sızdırmazlık macunu", "Yaygın ölçülerde conta ve rekor", "Spiral / vantuz", "Kova ve bez", "Kafa lambası"], askAtDoor: ["Ana vana nerede ve çalışıyor mu?", "Sorun ne zamandır var, daha önce müdahale edildi mi?"], safety: ["İşe başlamadan suyu kes; alt kata sızma riskini müşteriye bildir."] },
  },
  elektrik: {
    label: "Elektrik",
    revisitMonths: 24,
    customer: [
      p("panel", "Sigorta kutusunun önünü aç", "Usta önce hattı kesecek; kutuya ulaşmak güvenliğin ilk adımıdır."),
      p("symptom", "Sorunun ne zaman olduğunu not et", "'Fırın açılınca sigorta atıyor' gibi bir not, arızayı dakikalar içinde buldurur."),
      p("fixtures", "Takılacak ürün varsa hazır tut", "Avize, priz ya da anahtar sende ise kutusuyla bırak; uyumluluk yerinde kontrol edilir."),
    ],
    provider: { bring: ["Kontrol kalemi ve multimetre", "İzoleli tornavida seti", "Klemens ve buat", "İzole bant", "Yaygın sigorta tipleri", "Merdiven"], askAtDoor: ["Kaçak akım rölesi var mı, son ne zaman test edildi?", "Sorun tek hatta mı, tüm evde mi?"], safety: ["Hattı kesip kontrol kalemiyle doğrulamadan çalışma.", "Islak zeminde çalışma."] },
  },
  boya: {
    label: "Boya badana",
    revisitMonths: 36,
    customer: [
      p("furniture", "Eşyaları odanın ortasına topla", "Duvar dibi boşalırsa koruma örtüsü hızlı serilir, süre boyaya kalır."),
      p("paint-choice", "Renk ve boya markasını netleştir", "Boya ve malzeme genellikle kapsam dışıdır; kimin alacağını önceden mesajla konuş."),
      p("wall-items", "Tablo, raf ve perdeleri indir", "Askıları sökmek ustanın süresinden yer."),
      p("ventilation", "Havalandırmayı planla", "Boyalı odada uyumamak için bir gece planı yap."),
    ],
    provider: { bring: ["Koruma naylonu ve maskeleme bandı", "Rulo ve fırça seti", "Macun ve spatula", "Zımpara", "Merdiven"], askAtDoor: ["Boya ve malzeme kimden?", "Nemli ya da küflü bölge var mı?"], safety: ["Küflü duvarı nem kaynağı çözülmeden boyamanın kalıcı olmayacağını söyle."] },
  },
  cilingir: {
    label: "Çilingir",
    revisitMonths: null,
    customer: [
      p("id-ready", "Kimliğini ve adres belgeni hazır tut", "Güvenliğin için usta kapıyı açmadan önce evin sana ait olduğunu doğrular."),
      p("door-type", "Kapı ve kilit türünü not et", "Çelik kapı ya da elektronik kilit farklı alet ister; fotoğraf göndermek en iyisi."),
    ],
    provider: { bring: ["Kapı açma seti", "Yaygın barel ölçüleri", "Tornavida ve matkap", "Yedek anahtar taslağı"], askAtDoor: ["Kimlik ve adres doğrulaması (kapı açmadan önce)."], safety: ["Mülkiyet doğrulanmadan kapı açma."] },
  },
  klima: {
    label: "Klima ve beyaz eşya",
    revisitMonths: 12,
    customer: [
      p("model", "Cihazın marka ve modelini not et", "Etiket fotoğrafı, doğru filtre ve parçanın gelmesini sağlar."),
      p("access-unit", "İç ve dış üniteye erişimi aç", "Klimanın altındaki eşyaları kaldır; dış ünite balkondaysa yolu boşalt."),
      p("warranty", "Garanti belgesini kontrol et", "Cihaz garantideyse bazı işler yalnızca yetkili servisçe yapılmalıdır."),
    ],
    provider: { bring: ["Filtre temizlik spreyi ve fırça", "Drenaj pompası / hortum", "Koruma örtüsü", "Basınç saati (gerekirse)"], askAtDoor: ["Cihaz garantide mi?", "Koku, su damlatma ya da soğutmama hangisi?"], safety: ["Gazlı cihaz (kombi) bakımı yalnızca yetkili servis işidir; kapsam dışıdır."] },
  },
  montaj: {
    label: "Montaj",
    revisitMonths: null,
    customer: [
      p("boxes", "Paketleri montaj yapılacak odaya taşı", "Kutular yerinde ise usta doğrudan işe başlar."),
      p("wall", "Duvara asılacaksa duvarın türünü öğren", "Alçıpan, tuğla ya da beton farklı dübel ister."),
      p("manual", "Montaj kılavuzunu ve vida poşetini sakla", "Eksik parça baştan anlaşılır."),
    ],
    provider: { bring: ["Akülü matkap ve uç seti", "Farklı duvar tipleri için dübel", "Su terazisi", "Metre", "Kablo dedektörü"], askAtDoor: ["Duvarda elektrik ya da su hattı geçiyor mu?", "Eksik parça var mı?"], safety: ["Duvara delmeden önce kablo dedektörüyle tara."] },
  },
  nakliye: {
    label: "Taşıma",
    revisitMonths: null,
    customer: [
      p("fragile", "Kırılacakları ayrı kolilere koy ve işaretle", "Ekip neyi nasıl taşıyacağını bir bakışta anlar."),
      p("elevator", "Asansör ve yönetimden izin al", "Bazı binalarda taşıma saatleri sınırlıdır; işin yarıda kalmasını önler."),
      p("route", "Yeni adreste park yerini ayarla", "Araç kapıya yakın durursa taşıma süresi ciddi kısalır."),
    ],
    provider: { bring: ["Taşıma kayışları", "Battaniye ve streç film", "El arabası", "Tornavida seti"], askAtDoor: ["Asansör kullanılabilir mi?", "Özellikle hassas eşya hangisi?"], safety: ["Ağır eşyayı iki kişiyle ve dizlerden kaldırarak taşı."] },
  },
  bahce: {
    label: "Bahçe",
    revisitMonths: 1,
    customer: [
      p("obstacles", "Bahçedeki oyuncak ve hortumları topla", "Biçme makinesinin önündeki engeller hem süreyi hem riski artırır."),
      p("waste", "Atıkların nereye bırakılacağını belirle", "Atığın götürülmesi kapsam dışı olabilir; önceden konuş."),
    ],
    provider: { bring: ["Biçme makinesi ve yakıt", "Budama makası", "Eldiven ve gözlük", "Atık torbası"], askAtDoor: ["Sulama başlıkları nerede?", "Kesilmemesi gereken bitki var mı?"], safety: ["Çocuk ve evcil hayvan alandan çıkmadan makineyi çalıştırma."] },
  },
  havuz: {
    label: "Havuz",
    revisitMonths: 1,
    customer: [
      p("pump-room", "Makine dairesine erişimi aç", "Filtre ve pompaya ulaşmak bakımın yarısıdır."),
      p("chemicals", "Elindeki kimyasalları göster", "Kimyasal ürünler genellikle kapsam dışıdır; hangisinin kullanılacağını önceden konuşun."),
    ],
    provider: { bring: ["pH ve klor test kiti", "Teleskopik fırça ve kepçe", "Vakum başlığı", "Eldiven"], askAtDoor: ["Son kimyasal ne zaman atıldı?", "Havuz kullanılacak mı, ne zaman?"], safety: ["Kimyasalları asla birbirine karıştırma; suya ekle, tersini yapma."] },
  },
  tadilat: {
    label: "Tadilat",
    revisitMonths: null,
    customer: [
      p("scope-photo", "Yapılacak alanın fotoğrafını ve ölçüsünü paylaş", "Malzeme ve süre baştan netleşir; kapsam dışı ek iş tartışması azalır."),
      p("materials", "Malzemeyi kimin alacağını netleştir", "Fayans, silikon gibi malzemeler kapsama göre değişir."),
      p("neighbors", "Gürültülü iş için komşuları ve yönetimi bilgilendir", "Bina kurallarına uygun saatte çalışılır."),
    ],
    provider: { bring: ["Ölçü aletleri", "Kesici ve spatula seti", "Silikon tabancası", "Koruma örtüsü"], askAtDoor: ["Malzeme kimden?", "Çalışma saati kısıtı var mı?"], safety: ["Toz çıkaracak işte alanı kapat ve müşteriye haber ver."] },
  },
  genel: {
    label: "Hizmet",
    revisitMonths: null,
    customer: [
      p("photo", "Yapılacak işin fotoğrafını mesajla gönder", "Usta doğru alet ve malzemeyle gelir."),
      p("clear-area", "Çalışma alanını boşalt", "Hazır alan, ödediğin sürenin işe gitmesini sağlar."),
    ],
    provider: { bring: ["Temel el aletleri", "Koruma örtüsü", "Kafa lambası"], askAtDoor: ["İşin kapsamı sipariştekiyle aynı mı?"], safety: ["Kapsam dışı ek işi, müşteri uygulamada onaylamadan yapma."] },
  },
};

export const jobLabel = (kind: JobKind) => guides[kind].label;

/** Müşterinin usta gelmeden önce yapabileceği işler. Ortak maddeler sona eklenir. */
export function customerPrep(kind: JobKind): PrepItem[] {
  return [...guides[kind].customer, ...commonCustomer];
}

/** Ustanın yanına alması önerilenler ve kapıda soracakları. Her işte kapsam kuralı en sona eklenir. */
export function providerKit(kind: JobKind): ProviderKit {
  const kit = guides[kind].provider;
  const scopeRule = "Kapsam dışı ek işi, müşteri uygulamada onaylamadan yapma.";
  return { ...kit, safety: kit.safety.includes(scopeRule) ? kit.safety : [...kit.safety, scopeRule] };
}

/** Genel öneri: aynı türdeki işin yeniden gündeme gelebileceği süre (ay). Tek seferlik işlerde null. */
export const revisitMonths = (kind: JobKind) => guides[kind].revisitMonths;

/** Hazırlık ilerlemesi (0–100). Bilinmeyen kimlikler sayılmaz. */
export function prepProgress(items: PrepItem[], done: Iterable<string>): number {
  if (!items.length) return 0;
  const doneSet = new Set(done);
  return Math.round((items.filter(item => doneSet.has(item.id)).length / items.length) * 100);
}

/** Ev bakım takvimindeki kategori slug'larını iş türüne çevirir (usta mevsim radarı için). */
export function kindFromCategorySlug(slug: string | null | undefined): JobKind {
  if (!slug) return "genel";
  const map: Record<string, JobKind> = {
    "temizlik": "temizlik", "hali-yikama": "hali", "tesisat": "tesisat", "elektrik-hizmeti": "elektrik", "elektrik": "elektrik",
    "boya-badana": "boya", "cilingir": "cilingir", "klima-beyaz-esya": "klima", "mobilya-montaj": "montaj",
    "nakliye-yardimi": "nakliye", "bahce-bakimi": "bahce", "havuz-bakimi": "havuz", "havuz-bahce-bakimi": "havuz", "ev-tadilati": "tadilat",
  };
  return map[slug] ?? classifyJob(slug.replace(/-/g, " "));
}

// ---------------------------------------------------------------------------------------------
// Ev Karnesi
// ---------------------------------------------------------------------------------------------

export type LedgerOrder = { id: string; service_name: string; variant_name?: string | null; scope?: string | null; provider_id: string; provider_name: string; starts_at: string };
export type LedgerEntry = {
  kind: JobKind;
  label: string;
  count: number;
  last: LedgerOrder;
  monthsSince: number;
  /** Öneri tarihi geçti mi? Tek seferlik işlerde her zaman false. */
  due: boolean;
  /** Öneri tarihi (ISO). Tek seferlik işlerde null. */
  suggestedAt: string | null;
};

const monthsBetween = (from: Date, to: Date) => Math.max(0, (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) - (to.getDate() < from.getDate() ? 1 : 0));

/** Tamamlanan siparişleri iş türüne göre gruplar; en son yapılan iş ve bir sonraki öneriyle. */
export function buildHomeLedger(orders: LedgerOrder[], now: Date = new Date()): LedgerEntry[] {
  const groups = new Map<JobKind, LedgerOrder[]>();
  for (const order of orders) {
    if (!order?.starts_at || Number.isNaN(Date.parse(order.starts_at))) continue;
    const kind = classifyJob(order.service_name, order.variant_name, order.scope);
    groups.set(kind, [...(groups.get(kind) ?? []), order]);
  }
  const entries = [...groups.entries()].map(([kind, list]) => {
    const last = [...list].sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at))[0];
    const lastDate = new Date(last.starts_at);
    const interval = revisitMonths(kind);
    let suggestedAt: string | null = null;
    if (interval) { const next = new Date(lastDate); next.setMonth(next.getMonth() + interval); suggestedAt = next.toISOString(); }
    return { kind, label: jobLabel(kind), count: list.length, last, monthsSince: monthsBetween(lastDate, now), due: suggestedAt ? Date.parse(suggestedAt) <= now.getTime() : false, suggestedAt } satisfies LedgerEntry;
  });
  // Önce zamanı gelenler, sonra en yakın öneri, en sonda tek seferlik işler.
  return entries.sort((a, b) => Number(b.due) - Number(a.due) || (a.suggestedAt ? Date.parse(a.suggestedAt) : Infinity) - (b.suggestedAt ? Date.parse(b.suggestedAt) : Infinity));
}
