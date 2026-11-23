/**
 * Örnek usta profilleri.
 *
 * Bunlar GERÇEK USTA DEĞİLDİR. Satış açılmadan önce ziyaretçiye, FUWU'da bir usta profilinin
 * nasıl görüneceğini göstermek için hazırlanmış kurgusal örneklerdir.
 *
 * Kurallar (testle kilitli: tests/unit/demo-providers.test.ts):
 * - Veritabanına yazılmaz; eşleştirme, yapay zekâ önerisi, sipariş, sitemap ve aramaya girmez.
 * - Puan, yorum, tamamlanan iş sayısı ya da fiyat göstermez. 1 Ağustos 2026'dan beri yürürlükte olan
 *   Ticari Reklam ve Haksız Ticari Uygulamalar Yönetmeliği değişikliği değerlendirmeyi yalnızca hizmeti
 *   gerçekten satın alan tüketiciye bırakır; uydurma yorum hiçbir biçimde gösterilmez.
 * - Her görsel yapay zekâ ile üretilmiştir ve üzerinde "ÖRNEK · Yapay zekâ görseli" yazısı vardır.
 * - Belgeler yalnızca belge TÜRÜNÜ gösterir; numara, kurum logosu ya da mühür taşımaz.
 * - Ad + soyadının baş harfi kurgudur; gerçek bir kişiyi temsil etmez.
 */

export type DemoDocument = {
  /** Belge türü, mevzuattaki adıyla. */
  title: string;
  /** Belgeyi veren kurum türü (kurum adı/logosu değil). */
  issuer: string;
  /** Gerçek profilde bu belgenin müşteriye ne anlattığı. */
  meaning: string;
};

export type DemoWorkPhoto = { src: string; caption: string };

export type DemoProvider = {
  slug: string;
  /** Katalogdaki kategori slug'ı (src/lib/constants/services.ts ve service_categories). */
  categorySlug: string;
  categoryTitle: string;
  /** Mesleğin günlük dildeki adı. */
  trade: string;
  name: string;
  district: string;
  serviceAreas: string[];
  experienceYears: number;
  headline: string;
  about: string;
  services: string[];
  workingHours: string;
  portrait: string;
  portraitAlt: string;
  work: DemoWorkPhoto[];
  documents: DemoDocument[];
  /** Usta gelmeden önce müşterinin hazırlaması işe yarayan şeyler. */
  beforeVisit: string[];
};

export const DEMO_LABEL = "Örnek";
export const DEMO_IMAGE_LABEL = "Örnek · Yapay zekâ görseli";
export const DEMO_DISCLAIMER =
  "Bu bir örnek profildir. Kişi, fotoğraflar ve belgeler kurgudur; yapay zekâ ile hazırlanmıştır. Gerçek bir usta değildir ve randevu alınamaz.";

const img = (key: string, file: string) => `/images/demo/${key}-${file}.webp`;

export const demoProviders: DemoProvider[] = [
  {
    slug: "ornek-elektrikci",
    categorySlug: "elektrik-hizmeti",
    categoryTitle: "Elektrik Hizmeti",
    trade: "Elektrikçi",
    name: "Kemal A.",
    district: "Kadıköy",
    serviceAreas: ["Kadıköy", "Üsküdar", "Ataşehir"],
    experienceYears: 14,
    headline: "Priz, sigorta ve aydınlatma işlerinde temiz ve kayıtlı işçilik.",
    about:
      "Konut elektrik tesisatında çalışıyorum. İşe başlamadan önce sorunu yerinde ölçüp ne yapılacağını ve hangi malzemenin gerektiğini anlatırım. Pano içinde yaptığım her değişikliği etiketler, iş bitince devreleri seninle birlikte test ederim.",
    services: ["Priz ve anahtar değişimi", "Sigorta ve kaçak akım rölesi kontrolü", "Avize ve spot montajı", "Arıza tespiti"],
    workingHours: "Hafta içi 08.30–19.00, cumartesi 09.00–15.00",
    portrait: img("elektrik", "portrait"),
    portraitAlt: "Örnek elektrikçi profili için yapay zekâ ile üretilmiş portre",
    work: [
      { src: img("elektrik", "work-1"), caption: "Yeni priz ve anahtar montajı" },
      { src: img("elektrik", "work-2"), caption: "Düzenlenmiş sigorta panosu" },
    ],
    documents: [
      { title: "Elektrik Tesisatçısı (Seviye 3) Mesleki Yeterlilik Belgesi", issuer: "MYK yetkili belgelendirme kuruluşu", meaning: "Bu meslekte MYK belgesi ya da ustalık belgesi zorunludur. Gerçek profilde FUWU ekibi belgeyi inceler." },
      { title: "İş Sağlığı ve Güvenliği Eğitim Sertifikası", issuer: "Yetkili eğitim kurumu", meaning: "Güvenli çalışma eğitimini aldığını gösterir." },
    ],
    beforeVisit: ["Sorunlu hattın sigortasını kapat.", "Arızanın ve panonun fotoğrafını çek.", "Takılacak ürün varsa kutusunu hazırla."],
  },
  {
    slug: "ornek-tesisatci",
    categorySlug: "tesisat",
    categoryTitle: "Tesisat",
    trade: "Tesisatçı",
    name: "Hasan Y.",
    district: "Üsküdar",
    serviceAreas: ["Üsküdar", "Ümraniye", "Beykoz"],
    experienceYears: 22,
    headline: "Sızıntı, tıkanıklık ve batarya işlerini kırmadan dökmeden çözerim.",
    about:
      "Sıhhi tesisatta yirmi yılı aşkın tecrübem var. Önce kaçağın yerini bulur, gerekmedikçe fayans kırmam. Değiştirdiğim parçaları sana gösterir, iş bitince bağlantıları su açıkken birlikte kontrol ederiz.",
    services: ["Batarya ve musluk değişimi", "Lavabo ve gider açma", "Rezervuar ve klozet onarımı", "Su kaçağı tespiti"],
    workingHours: "Her gün 08.00–20.00",
    portrait: img("tesisat", "portrait"),
    portraitAlt: "Örnek tesisatçı profili için yapay zekâ ile üretilmiş portre",
    work: [
      { src: img("tesisat", "work-1"), caption: "Mutfak bataryası değişimi" },
      { src: img("tesisat", "work-2"), caption: "Lavabo altı bağlantıların yenilenmesi" },
    ],
    documents: [
      { title: "Sıhhi Tesisat Bakım Onarım ve Servis Elemanı Mesleki Yeterlilik Belgesi", issuer: "MYK yetkili belgelendirme kuruluşu", meaning: "Mesleki yeterliliğini bağımsız bir sınavla kanıtladığını gösterir." },
      { title: "Ustalık Belgesi (3308 sayılı Kanun)", issuer: "Mesleki Eğitim Merkezi", meaning: "Usta–çırak eğitimini tamamladığını gösterir." },
    ],
    beforeVisit: ["Ana ya da ara su vanasını kapat.", "Sızıntının yerini fotoğrafla.", "Lavabo altını boşalt."],
  },
  {
    slug: "ornek-temizlik",
    categorySlug: "temizlik",
    categoryTitle: "Temizlik",
    trade: "Ev temizliği",
    name: "Ayşe K.",
    district: "Beşiktaş",
    serviceAreas: ["Beşiktaş", "Şişli", "Sarıyer"],
    experienceYears: 9,
    headline: "Evine döndüğünde her köşe derli toplu, mutfak ve banyo pırıl pırıl.",
    about:
      "Ev ve taşınma temizliği yapıyorum. Gelmeden önce ev tipini ve öncelikli alanları sorarım. Yüzeye uygun ürün kullanırım; mermer ve ahşap yüzeylerde dikkatliyim. İş sonunda birlikte kısa bir tur atarız.",
    services: ["Genel ev temizliği", "Detaylı mutfak ve banyo", "Taşınma öncesi ve sonrası temizlik", "İç cam silme"],
    workingHours: "Pazartesi–cumartesi 09.00–18.00",
    portrait: img("temizlik", "portrait"),
    portraitAlt: "Örnek ev temizliği profili için yapay zekâ ile üretilmiş portre",
    work: [
      { src: img("temizlik", "work-1"), caption: "Detaylı mutfak temizliği" },
      { src: img("temizlik", "work-2"), caption: "Banyo ve duşakabin temizliği" },
    ],
    documents: [
      { title: "Temizlik Görevlisi Mesleki Yeterlilik Belgesi", issuer: "MYK yetkili belgelendirme kuruluşu", meaning: "Temizlik malzemesi ve yüzey bilgisini belgelediğini gösterir." },
      { title: "Hijyen Eğitimi Katılım Belgesi", issuer: "Yetkili eğitim kurumu", meaning: "Temel hijyen kurallarına dair eğitim aldığını gösterir." },
    ],
    beforeVisit: ["Öncelikli odaları not et.", "Hassas yüzeyleri belirt.", "Evcil hayvan varsa haber ver."],
  },
  {
    slug: "ornek-boyaci",
    categorySlug: "boya-badana",
    categoryTitle: "Boya Badana",
    trade: "Boyacı",
    name: "Murat D.",
    district: "Ataşehir",
    serviceAreas: ["Ataşehir", "Kadıköy", "Maltepe"],
    experienceYears: 17,
    headline: "Eşyayı örter, duvarı hazırlar, temiz çizgiyle teslim ederim.",
    about:
      "İç cephe boya ve badana yapıyorum. Boyadan önce duvardaki çatlak ve nemi kontrol eder, gerekiyorsa önce onu konuşuruz. Zemin ve eşyaları örtüp bantlarım; iş bitince kaba temizliği yaparak çıkarım.",
    services: ["Oda ve salon boyama", "Tavan boyama", "Alçı ve macun rötuşu", "Boya keşfi ve ölçü"],
    workingHours: "Hafta içi 08.00–18.00",
    portrait: img("boya", "portrait"),
    portraitAlt: "Örnek boyacı profili için yapay zekâ ile üretilmiş portre",
    work: [
      { src: img("boya", "work-1"), caption: "Boyası yenilenen salon" },
      { src: img("boya", "work-2"), caption: "Boya öncesi ve sonrası duvar" },
    ],
    documents: [
      { title: "Ustalık Belgesi — Boya Badana", issuer: "Mesleki Eğitim Merkezi", meaning: "Mesleğin usta düzeyinde belgelendiğini gösterir." },
      { title: "Yüksekte Çalışma Eğitimi Sertifikası", issuer: "Yetkili eğitim kurumu", meaning: "Merdiven ve iskelede güvenli çalışma eğitimi aldığını gösterir." },
    ],
    beforeVisit: ["Odaların yaklaşık ölçüsünü not et.", "Nem veya küf varsa fotoğrafla.", "Eşyaların taşınıp taşınmayacağını belirle."],
  },
  {
    slug: "ornek-klima-servisi",
    categorySlug: "klima-beyaz-esya",
    categoryTitle: "Klima & Beyaz Eşya",
    trade: "Klima ve beyaz eşya servisi",
    name: "Serkan T.",
    district: "Bakırköy",
    serviceAreas: ["Bakırköy", "Bahçelievler", "Zeytinburnu"],
    experienceYears: 11,
    headline: "Klima bakımı ve beyaz eşya arızasında önce tespit, sonra onay.",
    about:
      "Split klima bakımı ve beyaz eşya arıza tespiti yapıyorum. Gaz eksikliği şüphesinde önce kaçak kontrolü yaparım. Parça gerekiyorsa fiyatını sana söyler, onayın olmadan değiştirmem. Yetkili servis gerektiren durumları açıkça söylerim.",
    services: ["Split klima bakımı ve filtre temizliği", "Klima gaz kaçağı kontrolü", "Çamaşır ve bulaşık makinesi arıza tespiti", "Buzdolabı arıza tespiti"],
    workingHours: "Her gün 09.00–19.00",
    portrait: img("klima", "portrait"),
    portraitAlt: "Örnek klima servisi profili için yapay zekâ ile üretilmiş portre",
    work: [
      { src: img("klima", "work-1"), caption: "İç ünite filtre ve petek temizliği" },
      { src: img("klima", "work-2"), caption: "Dış ünite montaj kontrolü" },
    ],
    documents: [
      { title: "Florlu Sera Gazı (F-Gaz) Sertifikası", issuer: "Bakanlık yetkili belgelendirme kuruluşu", meaning: "Klima gazıyla çalışan teknisyenlerde aranan sertifikadır." },
      { title: "Soğutma Sistemleri Montaj ve Bakım Mesleki Yeterlilik Belgesi", issuer: "MYK yetkili belgelendirme kuruluşu", meaning: "Soğutma cihazlarında yeterliliğini belgelediğini gösterir." },
    ],
    beforeVisit: ["Cihazın marka ve modelini not et.", "Hata kodu varsa ekranın fotoğrafını çek.", "Dış üniteye erişimi kontrol et."],
  },
  {
    slug: "ornek-cilingir",
    categorySlug: "cilingir",
    categoryTitle: "Çilingir",
    trade: "Çilingir",
    name: "Erdem S.",
    district: "Şişli",
    serviceAreas: ["Şişli", "Beyoğlu", "Kağıthane"],
    experienceYears: 13,
    headline: "Kapıyı en az hasarla açar, adreste oturduğunu doğrulamadan açmam.",
    about:
      "Kapı açma ve kilit değişimi yapıyorum. Güvenliğin için kapıyı açmadan önce adreste oturduğunu gösteren bir belge isterim. Barel değişiminde seçenekleri ve güvenlik seviyelerini anlatır, eski bareli sana teslim ederim.",
    services: ["Kapı açma", "Barel ve kilit değişimi", "Çelik kapı kilit ayarı", "Anahtar kopyalama"],
    workingHours: "Her gün 07.00–23.00",
    portrait: img("cilingir", "portrait"),
    portraitAlt: "Örnek çilingir profili için yapay zekâ ile üretilmiş portre",
    work: [
      { src: img("cilingir", "work-1"), caption: "Çelik kapıya yeni barel montajı" },
      { src: img("cilingir", "work-2"), caption: "Düzenli çilingir alet çantası" },
    ],
    documents: [
      { title: "Esnaf ve Sanatkârlar Odası Kaydı", issuer: "Meslek odası", meaning: "İşini kayıtlı bir esnaf olarak yaptığını gösterir." },
      { title: "Ustalık Belgesi — Çilingir", issuer: "Mesleki Eğitim Merkezi", meaning: "Mesleğin usta düzeyinde belgelendiğini gösterir." },
    ],
    beforeVisit: ["Adreste oturduğunu gösteren bir belge hazırla.", "Kapı ve kilidin fotoğrafını çek.", "İçeride çocuk ya da ocakta yemek varsa önce 112'yi ara."],
  },
  {
    slug: "ornek-mobilya-montaj",
    categorySlug: "mobilya-montaj",
    categoryTitle: "Mobilya Montaj",
    trade: "Mobilya montajcısı",
    name: "Burak Ö.",
    district: "Maltepe",
    serviceAreas: ["Maltepe", "Kartal", "Pendik"],
    experienceYears: 7,
    headline: "Gardırop, yatak, TV ünitesi: terazili, sağlam ve hızlı kurulum.",
    about:
      "Paket mobilya kurulumu ve duvara montaj yapıyorum. Duvara asılacak işlerde önce duvarın türünü kontrol eder, uygun dübeli seçerim. Kurulum bitince kapak ve çekmece ayarlarını yapar, ambalajları toplu hâlde bırakırım.",
    services: ["Gardırop ve dolap kurulumu", "Yatak ve baza montajı", "TV duvar montajı", "Raf ve ayna asma"],
    workingHours: "Pazartesi–cumartesi 09.00–20.00",
    portrait: img("mobilya", "portrait"),
    portraitAlt: "Örnek mobilya montaj profili için yapay zekâ ile üretilmiş portre",
    work: [
      { src: img("mobilya", "work-1"), caption: "Kurulumu tamamlanan gardırop" },
      { src: img("mobilya", "work-2"), caption: "Kabloları gizlenmiş TV duvar montajı" },
    ],
    documents: [
      { title: "Ustalık Belgesi — Mobilya", issuer: "Mesleki Eğitim Merkezi", meaning: "Mesleğin usta düzeyinde belgelendiğini gösterir." },
      { title: "İş Sağlığı ve Güvenliği Eğitim Sertifikası", issuer: "Yetkili eğitim kurumu", meaning: "Güvenli çalışma eğitimini aldığını gösterir." },
    ],
    beforeVisit: ["Ürünün model bilgisini ve kutusunu hazırla.", "Duvara montajda duvarın türünü öğren.", "Parçaların eksiksiz olduğunu kontrol et."],
  },
  {
    slug: "ornek-nakliye",
    categorySlug: "nakliye-yardimi",
    categoryTitle: "Nakliye Yardımı",
    trade: "Evden eve nakliye",
    name: "Ali Rıza B.",
    district: "Pendik",
    serviceAreas: ["Pendik", "Tuzla", "Kartal", "Maltepe"],
    experienceYears: 19,
    headline: "Eşyan paketlenir, korunur ve aynı gün yerine kurulur.",
    about:
      "Evden eve ve parça eşya taşıma yapıyorum. Taşınmadan önce eşya listesini, kat ve asansör bilgisini alırım; sonradan sürpriz ücret çıkmaz. Kırılacak eşyaları ayrı paketler, mobilyaları battaniye ve streçle korurum.",
    services: ["Evden eve taşıma", "Parça eşya taşıma", "Paketleme ve ambalaj", "Mobilya söküm ve kurulum"],
    workingHours: "Her gün 07.00–21.00",
    portrait: img("nakliye", "portrait"),
    portraitAlt: "Örnek nakliye profili için yapay zekâ ile üretilmiş portre",
    work: [
      { src: img("nakliye", "work-1"), caption: "Korumaya alınmış mobilya ve koliler" },
      { src: img("nakliye", "work-2"), caption: "Düzenli yüklenmiş taşıma aracı" },
    ],
    documents: [
      { title: "K3 Yetki Belgesi", issuer: "Ulaştırma ve Altyapı Bakanlığı", meaning: "Yurt içi ev ve büro eşyası taşımacılığı için zorunlu yetki belgesidir." },
      { title: "Taşınma Eşyası Sigortası Poliçesi", issuer: "Sigorta şirketi", meaning: "Taşıma sırasında eşyanın sigorta kapsamında olduğunu gösterir." },
    ],
    beforeVisit: ["Eşya listesini çıkar.", "İki adreste kat ve asansör bilgisini not et.", "Kırılacak eşyaları ayrı belirt."],
  },
  {
    slug: "ornek-hali-yikama",
    categorySlug: "hali-yikama",
    categoryTitle: "Halı Yıkama",
    trade: "Halı ve koltuk yıkama",
    name: "Mehmet Ç.",
    district: "Esenyurt",
    serviceAreas: ["Esenyurt", "Beylikdüzü", "Avcılar", "Büyükçekmece"],
    experienceYears: 15,
    headline: "Halın kapından alınır, yıkanıp kurutulur, kokusuz teslim edilir.",
    about:
      "Halı ve koltuk yıkama yapıyorum. Halıyı almadan önce ölçer, lekeleri ve yıpranmış yerleri birlikte not ederiz. Kalıcı lekeyi çıkarma sözü vermem; ne kadar iyileşebileceğini baştan söylerim. Teslimde halı tamamen kurumuş olur.",
    services: ["Makine halı yıkama", "Yerinde koltuk yıkama", "Leke ön işlemi", "Adresten alma ve teslim"],
    workingHours: "Pazartesi–cumartesi 08.00–19.00",
    portrait: img("hali", "portrait"),
    portraitAlt: "Örnek halı yıkama profili için yapay zekâ ile üretilmiş portre",
    work: [
      { src: img("hali", "work-1"), caption: "Yıkanıp kurumaya asılan halılar" },
      { src: img("hali", "work-2"), caption: "Yerinde koltuk yıkama" },
    ],
    documents: [
      { title: "İşyeri Açma ve Çalışma Ruhsatı", issuer: "Belediye", meaning: "Yıkama tesisinin ruhsatlı olduğunu gösterir." },
      { title: "Esnaf ve Sanatkârlar Odası Kaydı", issuer: "Meslek odası", meaning: "İşini kayıtlı bir esnaf olarak yaptığını gösterir." },
    ],
    beforeVisit: ["Halıların yaklaşık ölçüsünü not et.", "Leke ve yıpranmaları fotoğrafla.", "El dokuması ya da ipek halı varsa önceden belirt."],
  },
  {
    slug: "ornek-havuz-bakimi",
    categorySlug: "havuz-bakimi",
    categoryTitle: "Havuz Bakımı",
    trade: "Havuz bakımı",
    name: "Cem E.",
    district: "Sarıyer",
    serviceAreas: ["Sarıyer", "Beykoz", "Çekmeköy"],
    experienceYears: 10,
    headline: "Berrak su için düzenli bakım, ölçümlü kimyasal.",
    about:
      "Villa ve site havuzlarının bakımını yapıyorum. Her ziyarette suyu ölçer, kimyasal miktarını ölçüme göre ayarlarım. Filtre ve pompa durumunu not eder, gerekiyorsa yapılacakları fotoğraflı olarak paylaşırım.",
    services: ["Haftalık havuz bakımı", "Su analizi ve kimyasal dengeleme", "Filtre ters yıkama", "Sezon açılışı ve kapanışı"],
    workingHours: "Mayıs–ekim her gün, kış aylarında randevuyla",
    portrait: img("havuz", "portrait"),
    portraitAlt: "Örnek havuz bakımı profili için yapay zekâ ile üretilmiş portre",
    work: [
      { src: img("havuz", "work-1"), caption: "Bakımı yapılmış berrak havuz" },
      { src: img("havuz", "work-2"), caption: "Düzenlenmiş pompa ve filtre odası" },
    ],
    documents: [
      { title: "Havuz Suyu Bakım ve Dezenfeksiyon Eğitimi Sertifikası", issuer: "Yetkili eğitim kurumu", meaning: "Havuz kimyasallarını doğru kullanma eğitimi aldığını gösterir." },
      { title: "Kimyasal Güvenliği Eğitim Sertifikası", issuer: "Yetkili eğitim kurumu", meaning: "Kimyasal saklama ve kullanma eğitimi aldığını gösterir." },
    ],
    beforeVisit: ["Havuzun yaklaşık hacmini not et.", "Su rengi değiştiyse kullanımı durdur.", "Makine dairesine erişimi kontrol et."],
  },
  {
    slug: "ornek-bahce-bakimi",
    categorySlug: "bahce-bakimi",
    categoryTitle: "Bahçe Bakımı",
    trade: "Bahçıvan",
    name: "Zeynep A.",
    district: "Beykoz",
    serviceAreas: ["Beykoz", "Sarıyer", "Çekmeköy"],
    experienceYears: 8,
    headline: "Çim, çit ve çiçek: mevsimine göre bakım planı.",
    about:
      "Ev ve site bahçelerinin bakımını yapıyorum. İlk ziyarette bahçenin durumuna göre mevsimlik bir bakım planı çıkarırım. Budama ve ilaçlamayı mevsiminde yaparım; atıkları toplayıp alanı temiz bırakırım.",
    services: ["Çim biçme ve kenar düzeltme", "Çit ve ağaç budama", "Çiçek ve fide dikimi", "Sulama sistemi kontrolü"],
    workingHours: "Pazartesi–cumartesi 08.00–17.00",
    portrait: img("bahce", "portrait"),
    portraitAlt: "Örnek bahçe bakımı profili için yapay zekâ ile üretilmiş portre",
    work: [
      { src: img("bahce", "work-1"), caption: "Biçilmiş çim ve düzeltilmiş çitler" },
      { src: img("bahce", "work-2"), caption: "Budanan güller ve yeni çiçek tarhı" },
    ],
    documents: [
      { title: "Bahçıvan Mesleki Yeterlilik Belgesi", issuer: "MYK yetkili belgelendirme kuruluşu", meaning: "Bahçe bakımında yeterliliğini belgelediğini gösterir." },
      { title: "Bitki Koruma Ürünleri Uygulama Eğitimi Belgesi", issuer: "İl Tarım ve Orman Müdürlüğü", meaning: "İlaçlama yapabilmek için aranan eğitimi aldığını gösterir." },
    ],
    beforeVisit: ["Bahçenin yaklaşık ölçüsünü not et.", "Hasta görünen bitkileri fotoğrafla.", "Sulama vanasının yerini göster."],
  },
];

export function getDemoProvider(slug: string) {
  return demoProviders.find(provider => provider.slug === slug) ?? null;
}

/** Kategori slug'ı (ya da eşdeğeri) için örnek profiller. */
export function getDemoProvidersForCategory(categorySlug: string) {
  const aliases: Record<string, string[]> = {
    "havuz-bahce-bakimi": ["havuz-bakimi", "bahce-bakimi"],
    "elektrik": ["elektrik-hizmeti"],
  };
  const wanted = new Set([categorySlug, ...(aliases[categorySlug] ?? [])]);
  return demoProviders.filter(provider => wanted.has(provider.categorySlug));
}

export function isDemoProviderSlug(value: string) {
  return value.startsWith("ornek-") && demoProviders.some(provider => provider.slug === value);
}
