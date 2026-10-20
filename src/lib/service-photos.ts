// Stock imagery illustrates services; it does not represent FUWU providers.
// Credits, original URLs and license verification: docs/service-photo-licenses.md.
export const servicePhotos = {
  cleaning: { src: "/images/services/cleaning.webp", alt: "Bir evin oturma odasını süpüren ve temizleyen iki profesyonel", position: "50% 61%" },
  plumbing: { src: "/images/services/plumbing-work.webp", alt: "Tesisat bağlantısı üzerinde el aletiyle çalışan teknisyen", position: "50% 57%" },
  electrical: { src: "/images/services/electrical.webp", alt: "Koruyucu ekipmanla elektrik panosunda çalışan elektrikçi", position: "40% 50%" },
  painting: { src: "/images/services/painting.webp", alt: "İç mekânda ruloyla duvar boyayan usta", position: "45% 42%" },
  "climate-appliance-service": { src: "/images/services/climate.webp", alt: "Klima dış ünitesini ölçüm cihazıyla kontrol eden teknik servis çalışanı", position: "45% 50%" },
  locksmith: { src: "/images/services/locksmith.webp", alt: "Kapı kolu ve kilit mekanizmasını ayarlayan eller", position: "50% 50%" },
  "furniture-assembly": { src: "/images/services/furniture.webp", alt: "Ahşap mobilyanın bağlantılarını el aletiyle birleştiren usta", position: "50% 50%" },
  "moving-help": { src: "/images/services/moving.webp", alt: "Bir evde karton kolileri taşıyan iki nakliye çalışanı", position: "65% 45%" },
  "pool-garden": { src: "/images/services/garden.webp", alt: "Bahçedeki bitkilerin bakımını yapan bahçıvan", position: "55% 55%" },
  renovation: { src: "/images/services/renovation.webp", alt: "Ev yenileme işinde matkapla çalışan usta", position: "52% 48%" },
} as const;

export function getServicePhoto(serviceId: string) {
  return servicePhotos[serviceId as keyof typeof servicePhotos] ?? servicePhotos.renovation;
}
