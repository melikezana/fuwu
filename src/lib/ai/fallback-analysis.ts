import type { AssistantAnalysis, AssistantCategory } from "@/lib/ai/assistant-schema";

/**
 * Yapay zekâ servisine ulaşılamadığında (kota, ağ, anahtar) kullanıcıyı boş bırakmayan kural tabanlı
 * ilk değerlendirme. Teşhis koymaz; kategoriyi anahtar kelimelerden tahmin eder, güvenlik adımlarını
 * ve uygun hizmeti gösterir. Acil işaret varsa her zaman acil yönlendirme yapar.
 */

const normalize = (value: string) =>
  value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");

const categoryKeywords: Array<[Exclude<AssistantCategory, "unknown">, string[]]> = [
  ["electric", ["elektrik", "priz", "sigorta", "pano", "kablo", "lamba", "avize", "aydinlatma", "kacak akim", "salter", "anahtar yanmiyor", "isik"]],
  ["plumbing", ["tesisat", "musluk", "batarya", "lavabo", "gider", "tikan", "tikali", "su kacag", "sizinti", "damlat", "klozet", "rezervuar", "sifon", "boru", "kombi su", "sofben", "su kacir", "su damli"]],
  ["white_goods", ["klima", "camasir makinesi", "bulasik makinesi", "buzdolabi", "firin", "kurutma", "beyaz esya", "derin dondurucu", "aspirator"]],
  ["locksmith", ["kilit", "kilid", "anahtar", "kapida kaldim", "kapi acma", "cilingir", "barel", "kapi kilitli"]],
  ["cleaning", ["temizli", "temizle", "sildir", "hali", "koltuk", "kir", "leke", "cam silme", "tasinma sonrasi", "insaat sonrasi", "kuf"]],
  ["painting", ["boya", "badana", "duvar", "rotus", "alci", "tavan lekesi", "dokulme", "macun"]],
  ["furniture", ["mobilya", "montaj", "duvara as", "dolap", "gardirop", "ikea", "kurulum", "raf", "masa kurulumu", "tv duvara"]],
  ["moving", ["nakliye", "tasima", "tasinma", "tasit", "tasinacak", "esya tasi", "evden eve", "koli"]],
  ["pool_garden", ["havuz", "bahce", "cim", "agac", "budama", "sulama", "yaprak"]],
  ["renovation", ["tadilat", "fayans", "seramik", "parke", "mutfak yenile", "banyo yenile", "yenilemek", "seramik yap", "kartonpiyer", "laminant"]],
];

const emergencyKeywords = [
  "gaz kokusu", "dogalgaz kokusu", "yanik kokusu", "duman", "yangin", "kivilcim", "elektrik carpti",
  "carpildi", "su baskini", "su basti", "tavan coktu", "cokme", "karbonmonoksit", "bas agrisi ve mide bulantisi",
  "cocuk kilitli", "bebek iceride",
];

const safeFirstStepsByCategory: Record<AssistantCategory, string[]> = {
  electric: ["Sorunlu hattın sigortasını panodan kapat.", "Islak elle priz, anahtar veya kabloya dokunma.", "Yanık izi ya da ısınma varsa o hattı kullanmayı bırak."],
  plumbing: ["Ana su vanasını ya da ilgili ara vanayı kapat.", "Su elektrik prizlerine yaklaşıyorsa o odanın sigortasını kapat.", "Sızıntının olduğu yeri havluyla kurulayıp fotoğrafını çek."],
  white_goods: ["Cihazın fişini çek.", "Su bağlantılı cihazsa musluğunu kapat.", "Hata kodu varsa ekranın fotoğrafını çek."],
  locksmith: ["İçeride çocuk, yaşlı ya da ocakta yemek varsa 112'yi ara.", "Kapıyı zorlamaya çalışma; kilit ve kasa zarar görebilir.", "Kimlik veya ev sahipliğini gösterebileceğin bir belgeyi hazırla."],
  cleaning: ["Temizlenecek alanın ve varsa lekenin fotoğrafını çek.", "Hassas yüzeyleri (mermer, ahşap) not et.", "Evde evcil hayvan varsa bunu belirt."],
  painting: ["Boyanacak odaların yaklaşık m² ölçüsünü not et.", "Nem veya küf izi varsa fotoğrafla; önce nem kaynağı çözülmeli.", "Eşyaların taşınıp taşınmayacağını belirle."],
  furniture: ["Ürünün marka ve model bilgisini ve kutu fotoğrafını hazırla.", "Duvara montaj gerekiyorsa duvarın beton mu alçı mı olduğunu öğren.", "Parçaların eksiksiz olduğunu kontrol et."],
  moving: ["Taşınacak eşyaların listesini ve kat bilgisini hazırla.", "Asansör olup olmadığını iki adreste de not et.", "Kırılacak eşyaları ayrı belirt."],
  pool_garden: ["Alanın yaklaşık büyüklüğünü ve fotoğrafını hazırla.", "Havuzda su rengi değiştiyse kullanımını durdur.", "Sulama sistemi varsa vanasını kapat."],
  renovation: ["Yenilenecek alanın ölçülerini ve fotoğraflarını hazırla.", "Taşıyıcı duvara müdahale gerekip gerekmediğini kendin belirlemeye çalışma.", "Bina yönetiminin çalışma saatlerini öğren."],
  unknown: ["Sorunun görüldüğü yerin net bir fotoğrafını çek.", "Ne zaman başladığını ve ne sıklıkla olduğunu not et.", "Su, elektrik veya gaz söz konusuysa ilgili vanayı/sigortayı kapat."],
};

const avoidByCategory: Partial<Record<AssistantCategory, string[]>> = {
  electric: ["Sigortayı bantlayıp sürekli açık tutma.", "Uzman olmadan pano içini açma."],
  plumbing: ["Tıkanıklıkta kimyasalları karıştırma."],
  white_goods: ["Cihazın arka kapağını açma."],
  locksmith: ["Tanımadığın kişilere ödeme yapıp kapı açtırma."],
  renovation: ["Taşıyıcı duvar ya da kolon kırma."],
};

const issueByCategory: Record<AssistantCategory, string> = {
  electric: "Elektrik tesisatı veya aydınlatma ile ilgili bir sorun",
  plumbing: "Su tesisatı, sızıntı veya tıkanıklık",
  white_goods: "Klima veya beyaz eşya arızası ya da bakımı",
  locksmith: "Kapı açma veya kilit işlemi",
  cleaning: "Temizlik ihtiyacı",
  painting: "Boya, badana veya duvar onarımı",
  furniture: "Mobilya montajı veya kurulum",
  moving: "Eşya taşıma veya nakliye",
  pool_garden: "Havuz veya bahçe bakımı",
  renovation: "Ev tadilatı veya yenileme",
  unknown: "Sorunun türü net değil",
};

export function detectCategory(text: string): AssistantCategory {
  const haystack = normalize(text);
  let best: AssistantCategory = "unknown";
  let bestScore = 0;
  for (const [category, keywords] of categoryKeywords) {
    const score = keywords.reduce((total, keyword) => total + (haystack.includes(keyword) ? 1 : 0), 0);
    if (score > bestScore) {
      best = category;
      bestScore = score;
    }
  }
  return best;
}

// Tek kelimeyle yakalanamayan acil durumlar: iki işaretin aynı mesajda birlikte geçmesi aranır.
// Kaçırılan bir acil durum, gereksiz bir uyarıdan çok daha pahalıdır; kurallar bu yüzden geniş tutulur.
const emergencyPatterns: RegExp[] = [
  /gaz\w*\s+(koku|kok|kacag|kacir|sizdir|sizinti)/,
  /(koku|kokuyor)\w*.{0,30}\bgaz|\bgaz\w*.{0,30}(kokuyor|kokusu)/,
  /\balev(?!\s+alm)|tutustu|yangin/,
  /(pano|sigorta|priz|kablo|kutu|kombi|ocak|cihaz|makine)\w*.{0,40}(yaniyor|yandi|duman|kivilcim|\beriyor)/,
  /elektrik\w*\s+carp|carpti|carpildi/,
  /boru\w*\s+patla|su\w*\s+bas(ti|kini|iyor)/,
  /(tavan|duvar|balkon|kolon)\w*\s+(coktu|cokuyor|catirdi)/,
  /(cocu[kg](?!\s+odas)|bebe[kg]|yasli|annem|babam)\w*.{0,60}(kilitli|iceride kaldi|mahsur|kapi kapandi)/,
  /(kilitli|iceride kaldi|mahsur|kapi kapandi).{0,60}(cocu[kg](?!\s+odas)|bebe[kg]|yasli)/,
];

export function hasEmergencySignal(text: string) {
  const haystack = normalize(text);
  return emergencyKeywords.some(keyword => haystack.includes(keyword)) || emergencyPatterns.some(pattern => pattern.test(haystack));
}

export function buildFallbackAnalysis(input: { message: string; history?: string[]; categoryHint?: AssistantCategory | null }): AssistantAnalysis {
  const text = [input.message, ...(input.history ?? [])].join(" ");
  const detected = detectCategory(text);
  const category = detected === "unknown" && input.categoryHint ? input.categoryHint : detected;
  const emergency = hasEmergencySignal(text);
  const known = category !== "unknown";

  return {
    summary: emergency
      ? "Anlattığın durum acil bir risk içerebilir. Önce kendi güvenliğini sağla."
      : known
        ? `Anlattıklarına göre bu bir “${issueByCategory[category].toLocaleLowerCase("tr-TR")}” gibi görünüyor. Aşağıdaki adımlar güvenle başlamanı sağlar; kesin değerlendirmeyi usta yerinde yapar.`
        : "Sorunu tam anlayamadım. Biraz daha ayrıntı yazarsan ya da fotoğraf eklersen doğru hizmete yönlendirebilirim.",
    likelyIssue: emergency ? "Acil güvenlik riski olabilir (gaz, elektrik, su veya yapı)" : issueByCategory[category],
    category,
    urgency: emergency ? "emergency" : known ? "medium" : "low",
    confidence: emergency ? 0.6 : known ? 0.45 : 0.15,
    safeFirstSteps: emergency
      ? ["Bulunduğun yerden uzaklaş ve başkalarını da uzaklaştır.", "Güvenliyse gaz, elektrik veya su ana vanasını/sigortasını kapat.", "112 Acil Çağrı'yı ara; gaz kokusunda 187 Doğal Gaz Acil'i ara."]
      : safeFirstStepsByCategory[category],
    avoidDoing: emergency
      ? ["Gaz kokusu varken ışık, çakmak veya elektrikli cihaz açma.", "Su baskınında prize ya da elektrikli cihaza dokunma."]
      : avoidByCategory[category] ?? [],
    professionalNeeded: known || emergency,
    emergencyMessage: emergency
      ? "Bu bir acil durum olabilir. 112'yi ara; gaz kokusunda 187'yi ara. Normal randevu bu durum için doğru çözüm değildir."
      : null,
    followUpQuestions: known
      ? ["Sorun ne zamandan beri var?", "Hangi ilçedesin?", "Bir fotoğraf ekleyebilir misin?"]
      : ["Sorun evin hangi bölümünde (mutfak, banyo, elektrik, kapı…)?", "Ne görüyorsun ya da ne duyuyorsun?", "Bir fotoğraf ekleyebilir misin?"],
    providerSearchRecommended: known && !emergency,
  };
}
