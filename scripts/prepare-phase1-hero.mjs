import fs from "node:fs/promises";
import sharp from "sharp";

// Bulat843 / Pexels 32588548. Commercial-use record: docs/ASSET_CREDITS.md.
const source = "https://images.pexels.com/photos/32588548/pexels-photo-32588548.jpeg?auto=compress&cs=tinysrgb&w=1600";
const response = await fetch(source, { signal: AbortSignal.timeout(30_000) });
if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) throw new Error(`Photo download failed: ${response.status}`);
const destination = "public/images/services/hero-plumbing.webp";
await fs.mkdir("public/images/services", { recursive: true });
await sharp(Buffer.from(await response.arrayBuffer())).rotate().resize(960, 1080, { fit: "cover", position: "centre", withoutEnlargement: true }).webp({ quality: 80, effort: 6 }).toFile(destination);
console.log(JSON.stringify({ destination, source, bytes: (await fs.stat(destination)).size, width: 960, height: 1080 }, null, 2));
