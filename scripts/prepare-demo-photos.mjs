// Örnek usta profilleri için yapay zekâ ile üretilmiş görselleri WebP'ye çevirir ve üzerine
// kalıcı "ÖRNEK · Yapay zekâ görseli" etiketi basar. Etiket görselin içine işlenir; görsel
// paylaşılsa ya da başka yerde kullanılsa bile örnek olduğu görünür kalır.
//
// Kullanım: node scripts/prepare-demo-photos.mjs <kaynak-klasör>
// Kaynak klasörde <anahtar>-<tür>.png|jpg dosyaları bulunur (ör. elektrik-portrait.png, elektrik-work-1.jpg).
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const source = process.argv[2];
if (!source) {
  console.error("Kaynak klasör gerekli.");
  process.exit(2);
}
const output = path.resolve("public/images/demo");
await fs.mkdir(output, { recursive: true });

const LABEL = "ÖRNEK · Yapay zekâ görseli";

function labelSvg(width, height) {
  const fontSize = Math.round(Math.max(15, width * 0.026));
  const padX = Math.round(fontSize * 0.75);
  const boxHeight = Math.round(fontSize * 2);
  const boxWidth = Math.round(LABEL.length * fontSize * 0.56 + padX * 2);
  const margin = Math.round(fontSize * 0.8);
  const y = height - boxHeight - margin;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect x="${margin}" y="${y}" width="${boxWidth}" height="${boxHeight}" rx="${Math.round(boxHeight / 2)}" fill="#0a2540" fill-opacity="0.82"/>
    <circle cx="${margin + padX}" cy="${y + boxHeight / 2}" r="${Math.round(fontSize * 0.28)}" fill="#ff6500"/>
    <text x="${margin + padX + Math.round(fontSize * 0.6)}" y="${y + boxHeight / 2 + fontSize * 0.36}" font-family="Inter, DejaVu Sans, sans-serif" font-size="${fontSize}" font-weight="700" fill="#ffffff">${LABEL}</text>
  </svg>`);
}

const files = (await fs.readdir(source)).filter(file => /\.(png|jpe?g|webp)$/i.test(file)).sort();
const report = [];
for (const file of files) {
  const key = file.replace(/\.(png|jpe?g|webp)$/i, "");
  if (!/^[a-z]+-(portrait|work-\d)$/.test(key)) continue;
  const portrait = key.endsWith("-portrait");
  const width = portrait ? 720 : 960;
  const height = portrait ? 900 : 720;
  const base = sharp(path.join(source, file)).rotate().resize(width, height, { fit: "cover", position: portrait ? "attention" : "centre" });
  const target = path.join(output, `${key}.webp`);
  await base
    .composite([{ input: labelSvg(width, height), top: 0, left: 0 }])
    .webp({ quality: 74, effort: 5 })
    // Üretim aracının bıraktığı meta veriler (EXIF/XMP) kopyalanmaz.
    .toFile(target);
  const { size } = await fs.stat(target);
  report.push({ file: path.relative(process.cwd(), target), width, height, bytes: size });
}
console.log(JSON.stringify(report, null, 2));
console.log(`${report.length} görsel hazırlandı.`);
