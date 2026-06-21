# Frontend Tasarım Kuralları

FUWU arayüzünde renk paleti değişmeden, tipografi ve yüzey hiyerarşisi aşağıdaki ortak ölçekleri kullanır.

## Tipografi

- H1 ve hero başlıkları: `font-bold` (700)
- H2 bölüm başlıkları: `font-bold` veya `font-semibold` (600–700)
- Kart başlığı, fiyat ve önemli rakamlar: `font-semibold` (600)
- Buton metni: `font-semibold` (600)
- Etiket, rozet ve meta metin: `font-medium` veya `font-semibold` (500–600)
- Gövde metni: `font-normal` veya `font-medium` (400–500)
- `font-black` (900) standart arayüz metinlerinde kullanılmaz.

## Radius ölçeği

- Kontrol, buton, chip ve badge: `rounded-md`
- Kart ve standart yüzey: `rounded-lg`
- Büyük hero/form paneli ve modal: `rounded-xl`
- Avatar veya durum noktası: bağlama göre `rounded-lg` ya da `rounded-full`
- Cihaz mockup’ı gibi gerçek biçimi temsil eden illüstrasyonlar özel radius kullanabilir.

## Shadow ölçeği

- `--shadow-subtle`: küçük kontrol, chip ve hafif ayrım
- `--shadow-card`: standart kart
- `--shadow-elevated`: sticky panel, hover ve öne çıkan yüzey
- `--shadow-premium`: yalnızca büyük hero/özel vurgu yüzeyi
- `--shadow-action`: turuncu ana CTA için semantik aksiyon gölgesi

Yeni bileşenler rastgele `rgba(...)` box-shadow değerleri üretmek yerine bu token’ları kullanır. Inset çizgiler, yükselti değil kontrol kenarlığı sayıldığı için bu ölçeğin dışında tutulabilir.
