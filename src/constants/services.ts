export type ServiceIconName =
  | "air-conditioner"
  | "appliance"
  | "bolt"
  | "box"
  | "calendar-check"
  | "graduation-cap"
  | "home"
  | "paint-roller"
  | "pipe"
  | "rug"
  | "sparkles"
  | "truck"
  | "wrench";

export type Service = {
  id: string;
  category: string;
  title: string;
  description: string;
  iconName: ServiceIconName;
  startingHint: string;
  href: string;
};

export const services: Service[] = [
  {
    id: "plumbing",
    category: "Onarım",
    title: "Tesisat",
    description: "Su kaçağı, gider açma ve musluk değişimi için yakınındaki tesisatçıları karşılaştır.",
    iconName: "pipe",
    startingHint: "Usta Bul",
    href: "/providers?category=Tesisat",
  },
  {
    id: "electrical",
    category: "Onarım",
    title: "Elektrik hizmeti",
    description: "Priz, aydınlatma, sigorta ve arıza tespitinde güvenilir elektrik ustalarını gör.",
    iconName: "bolt",
    startingHint: "Usta Bul",
    href: "/providers?category=Elektrik",
  },
  {
    id: "cleaning",
    category: "Ev Bakımı",
    title: "Temizlik",
    description: "Ev, ofis ve taşınma sonrası temizlik için uygun profilleri hızla listele.",
    iconName: "sparkles",
    startingHint: "Usta Bul",
    href: "/providers?category=Temizlik",
  },
  {
    id: "carpet-cleaning",
    category: "Ev Bakımı",
    title: "Halı Yıkama",
    description: "Halı yıkama, teslim alma ve leke çıkarma için uygun profilleri karşılaştır.",
    iconName: "rug",
    startingHint: "Usta Bul",
    href: "/providers?category=Halı%20Yıkama",
  },
  {
    id: "climate-appliance-service",
    category: "Teknik Servis",
    title: "Klima & Beyaz Eşya",
    description: "Klima bakımı, montajı ve beyaz eşya arızaları için uygun teknik servisleri karşılaştır.",
    iconName: "air-conditioner",
    startingHint: "Usta Bul",
    href: "/providers?category=Klima%20%26%20Beyaz%20Eşya",
  },
  {
    id: "furniture-assembly",
    category: "Montaj",
    title: "Mobilya Montaj",
    description: "Dolap, yatak, masa ve raf montajında deneyimli ustalara hemen ulaş.",
    iconName: "box",
    startingHint: "Usta Bul",
    href: "/providers?category=Mobilya%20Montaj",
  },
  {
    id: "painting",
    category: "Proje",
    title: "Boya Badana",
    description: "Boya badana, rötuş ve yüzey hazırlığı için fiyat aralığını gör, usta seç.",
    iconName: "paint-roller",
    startingHint: "Usta Bul",
    href: "/providers?category=Boya%20Badana",
  },
  {
    id: "moving-help",
    category: "Taşıma",
    title: "Nakliye Yardımı",
    description: "Koli taşıma, küçük eşya nakli ve apartman içi taşıma desteği için usta bul.",
    iconName: "truck",
    startingHint: "Usta Bul",
    href: "/providers?category=Nakliye%20Yardımı",
  },
];
