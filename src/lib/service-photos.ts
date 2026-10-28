// Stock imagery illustrates services; it does not represent FUWU providers.
// Credits, original URLs and license verification: docs/service-photo-licenses.md.
export const servicePhotos = {
  cleaning: { src: "/images/services/cleaning.webp", alt: "Bir evin oturma odasını süpüren ve temizleyen iki profesyonel", position: "50% 61%" },
  plumbing: { src: "/images/services/plumbing-work.webp", alt: "Tesisat bağlantısı üzerinde el aletiyle çalışan teknisyen", position: "50% 57%" },
  electrical: { src: "/images/services/electrical.webp", alt: "Koruyucu ekipmanla elektrik panosunda çalışan elektrikçi", position: "40% 50%" },
  painting: { src: "/images/services/painting.webp", alt: "İç mekânda ruloyla duvar boyayan usta", position: "45% 42%" },
  "climate-appliance-service": { src: "/images/services/appliance.webp", alt: "Evde beyaz eşya onarımı yapan teknik servis çalışanı", position: "50% 48%" },
  climate: { src: "/images/services/climate.webp", alt: "Klima dış ünitesini ölçüm cihazıyla kontrol eden teknik servis çalışanı", position: "45% 50%" },
  locksmith: { src: "/images/services/locksmith.webp", alt: "Kapı kolu ve kilit mekanizmasını ayarlayan eller", position: "50% 50%" },
  "furniture-assembly": { src: "/images/services/furniture.webp", alt: "Ahşap mobilyanın bağlantılarını el aletiyle birleştiren usta", position: "50% 50%" },
  "moving-help": { src: "/images/services/moving.webp", alt: "Bir evde karton kolileri taşıyan iki nakliye çalışanı", position: "65% 45%" },
  "pool-garden": { src: "/images/services/garden.webp", alt: "Bahçedeki bitkilerin bakımını yapan bahçıvan", position: "55% 55%" },
  pool: { src: "/images/services/pool.webp", alt: "Uzun saplı ekipmanla açık havuzun bakımını yapan çalışan", position: "50% 50%" },
  carpet: { src: "/images/services/carpet.webp", alt: "Eldiven ve fırçayla halı yüzeyini temizleyen kişi", position: "50% 50%" },
  repair: { src: "/images/services/renovation.webp", alt: "El aletiyle ev içinde tamirat yapan usta", position: "52% 48%" },
  renovation: { src: "/images/services/renovation.webp", alt: "Ev yenileme işinde matkapla çalışan usta", position: "52% 48%" },
} as const;

export type ServicePhotoDefinition = { src: string; alt: string; position: string };

// Exact aliases only: an unknown profession must never inherit a renovation photo.
const aliases: Record<string, keyof typeof servicePhotos> = {
  "elektrik": "electrical", "elektrik-hizmeti": "electrical", "elektrik-ariza-tespiti": "electrical",
  "tesisat": "plumbing", "su-tesisati": "plumbing", "musluk-montaji": "plumbing",
  "temizlik": "cleaning", "ev-temizligi": "cleaning", "boya-badana": "painting",
  "cilingir": "locksmith", "beyaz-esya": "climate-appliance-service", "klima-beyaz-esya": "climate-appliance-service",
  "klima": "climate", "klima-bakimi": "climate", "mobilya-montaj": "furniture-assembly", "mobilya-montaji": "furniture-assembly",
  "tamirat": "repair", "ev-tamirati": "repair", "ev-tadilati": "renovation", "tadilat": "renovation",
  "nakliye": "moving-help", "nakliyat": "moving-help", "tasima": "moving-help", "nakliye-yardimi": "moving-help",
  "hali-yikama": "carpet", "havuz-bakimi": "pool", "bahce-bakimi": "pool-garden",
};
export function getServicePhoto(...keys: (string | undefined | null)[]): ServicePhotoDefinition | null {
  for (const key of keys) {
    if (!key) continue;
    const normalized = key.toLocaleLowerCase("tr-TR").replaceAll("ı", "i").replaceAll("ş", "s").replaceAll("ğ", "g").replaceAll("ü", "u").replaceAll("ö", "o").replaceAll("ç", "c").replaceAll(" ", "-");
    const photo = servicePhotos[normalized as keyof typeof servicePhotos] ?? servicePhotos[aliases[normalized]];
    if (photo) return photo;
  }
  return null;
}
