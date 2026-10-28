import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const destination = path.resolve("public/images/services");
const photos = [
  ["cleaning", 6195278], ["plumbing-work", 32588548],
  ["electrical", 17842832], ["painting", 5493655], ["climate", 5463575],
  ["locksmith", 7220892], ["furniture", 31755424], ["moving", 7464687],
  ["garden", 13834298], ["renovation", 8961401],
  ["appliance", 34734504], ["pool", 21327976], ["carpet", 5233260],
];
await fs.mkdir(destination, { recursive: true });
const results = [];
for (const [name, id] of photos) {
  if (process.argv.includes("--missing") && await fs.stat(path.join(destination, name + ".webp")).then(() => true).catch(() => false)) continue;
  const url = "https://images.pexels.com/photos/" + id + "/pexels-photo-" + id + ".jpeg?auto=compress&cs=tinysrgb&w=1600";
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) {
    throw new Error("Photo " + id + " could not be downloaded: " + response.status);
  }
  const original = Buffer.from(await response.arrayBuffer());
  const file = path.join(destination, name + ".webp");
  await sharp(original).rotate().resize({ width: name === "cleaning" ? 1000 : 900, withoutEnlargement: true }).webp({ quality: 78, effort: 6 }).toFile(file);
  if (name === "cleaning") {
    const rotated = await sharp(original).rotate().toBuffer();
    const metadata = await sharp(rotated).metadata();
    await sharp(rotated).extract({
      left: 0, top: Math.floor(metadata.height * .371),
      width: metadata.width, height: Math.floor(metadata.height * .429),
    }).resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 82, effort: 6 }).toFile(path.join(destination, "hero-cleaning.webp"));
  }
  results.push({ file: path.basename(file), bytes: (await fs.stat(file)).size, original: url });
}
console.log(JSON.stringify(results, null, 2));
