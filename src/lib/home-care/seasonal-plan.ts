/**
 * Ev Bakım Takvimi — İstanbul iklimine göre ay ay ev bakım hatırlatmaları.
 *
 * Kişisel veri tutmaz ve yapay zekâ çağırmaz: içerik elle yazılmış, sabit bir bakım rehberidir.
 * `categorySlug` dolu olan iş bir FUWU hizmet kategorisine bağlanır; null olan iş FUWU'nun sunmadığı
 * (örneğin yetkili servis gerektiren) bir hatırlatmadır ve bağlantı gösterilmez.
 */

export type HomeCareTask = {
  categorySlug: string | null;
  id: string;
  title: string;
  why: string;
};

export type HomeCareMonth = { month: number; label: string; tasks: HomeCareTask[] };

const monthLabels = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

const task = (id: string, title: string, why: string, categorySlug: string | null): HomeCareTask => ({ categorySlug, id, title, why });

const plan: Record<number, HomeCareTask[]> = {
  1: [
    task("pipes-cold", "Su tesisatını soğuğa karşı kontrol ettir", "Balkon ve dış cephedeki açık borular don olaylarında çatlayabilir.", "tesisat"),
    task("radiators", "Isınmayan petekleri not et", "Üstü soğuk kalan petek hava yapmış olabilir; ısınma faturası boşa artar.", "tesisat"),
  ],
  2: [
    task("mold", "Nem ve küf izlerine bak", "Kış sonunda köşelerde ve pencere çevresinde oluşan küf, boyadan önce nem kaynağı çözülerek giderilir.", "boya-badana"),
    task("residual-current", "Kaçak akım rölesini test ettir", "Elektrikli ısıtıcıların yoğun kullanıldığı dönemde koruma düzeninin çalıştığından emin ol.", "elektrik-hizmeti"),
  ],
  3: [
    task("spring-clean", "Bahar temizliğini planla", "Camlar, perdeler ve kış boyunca kapalı kalan alanlar için en uygun dönem.", "temizlik"),
    task("drains", "Balkon ve teras giderlerini açtır", "Bahar yağmurlarında tıkalı gider, alt kata su sızdırır.", "tesisat"),
  ],
  4: [
    task("ac-prep", "Klimayı yaz gelmeden baktır", "Sıcaklar başladığında servis yoğunlaşır; filtre temizliği nisanda hem kolay hem ucuz.", "klima-beyaz-esya"),
    task("garden-open", "Bahçe ve havuz açılış bakımını yaptır", "Sezon başında yapılan bakım, yaz boyunca çıkacak sorunları azaltır.", "havuz-bahce-bakimi"),
  ],
  5: [
    task("paint", "Boya badana için kuru havayı değerlendir", "Mayıs ve haziranda boya daha hızlı kurur, ev daha kısa sürede havalanır.", "boya-badana"),
    task("ac-prep-late", "Klima bakımını geciktirme", "Yaz başlamadan filtre ve drenaj kontrolü, koku ve su damlatma sorununu önler.", "klima-beyaz-esya"),
  ],
  6: [
    task("pool", "Havuz bakımını düzene koy", "Sıcak havada su dengesi hızlı bozulur; düzenli bakım kullanımı güvenli tutar.", "havuz-bahce-bakimi"),
    task("fridge", "Buzdolabı ve beyaz eşyaları kontrol ettir", "Sıcak aylarda en çok zorlanan cihazlar bunlardır; arıza yaz ortasında çıkar.", "klima-beyaz-esya"),
  ],
  7: [
    task("holiday-check", "Tatile çıkmadan su ve elektriği kontrol ettir", "Damlatan bir musluk ya da eskimiş bir priz, ev boşken büyük hasara dönüşebilir.", "tesisat"),
    task("locks", "Kapı kilidini gözden geçir", "Uzun süre boş kalacak ev için kilit ve barel kontrolü iyi bir önlemdir.", "cilingir"),
  ],
  8: [
    task("moving", "Taşınma varsa nakliyeyi erken ayarla", "Ağustos ve eylül taşınma sezonudur; uygun gün ve saat hızla dolar.", "nakliye-yardimi"),
    task("assembly", "Yeni eşyaların montajını planla", "Taşınma sonrası dolap, karyola ve TV montajı aynı güne sığdırılabilir.", "mobilya-montaj"),
  ],
  9: [
    task("boiler", "Kombi bakımını yetkili servise yaptır", "Kış öncesi yıllık bakım hem güvenlik hem verim için gereklidir. Gazlı cihaz bakımını yalnızca markanın yetkili servisi yapmalıdır.", null),
    task("radiator-clean", "Petek ve tesisatı kışa hazırlat", "Isıtma açılmadan önce yapılan kontrol, ilk soğukta kalorifer sorununu önler.", "tesisat"),
  ],
  10: [
    task("insulation", "Pencere ve kapı yalıtımını yenilet", "Fitil ve silikon yenilemesi ısı kaybını azaltır.", "ev-tadilati"),
    task("lighting", "Aydınlatma ve prizleri kontrol ettir", "Günler kısalırken yanmayan lamba ve gevşek prizleri toplu hallet.", "elektrik-hizmeti"),
  ],
  11: [
    task("heater-load", "Elektrik tesisatını ısıtıcı yüküne karşı baktır", "Isıtıcı takıldığında sigorta atıyorsa hat ya da sigorta yetersiz olabilir.", "elektrik-hizmeti"),
    task("sink-drains", "Mutfak ve banyo giderlerini açtır", "Kışın daha çok kullanılan giderlerde yavaş akma, tıkanmanın ilk işaretidir.", "tesisat"),
  ],
  12: [
    task("year-end-clean", "Yılbaşı öncesi detaylı temizliği ayarla", "Misafir döneminden önce uygun gün bulmak aralık ortasından sonra zorlaşır.", "temizlik"),
    task("pipes-winter", "Açıktaki su borularını korumaya aldır", "İlk don olayından önce yapılan yalıtım, patlak boru riskini azaltır.", "tesisat"),
  ],
};

/** İstanbul saatine göre içinde bulunulan ay (1–12). */
export function istanbulMonth(now: Date = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Istanbul", month: "numeric" }).format(now));
}

export function getHomeCareMonth(month: number): HomeCareMonth {
  const safe = Number.isInteger(month) && month >= 1 && month <= 12 ? month : 1;
  return { month: safe, label: monthLabels[safe - 1], tasks: plan[safe] };
}

/** Bu ay ve sonraki `ahead` ay; yıl sonunda ocak ayına sarar. */
export function getHomeCarePlan(now: Date = new Date(), ahead = 1): HomeCareMonth[] {
  const start = istanbulMonth(now);
  return Array.from({ length: Math.min(12, Math.max(1, ahead + 1)) }, (_, index) => getHomeCareMonth(((start - 1 + index) % 12) + 1));
}

export const homeCareCategoryHref = (slug: string) => `/services?${new URLSearchParams({ category: slug })}`;
