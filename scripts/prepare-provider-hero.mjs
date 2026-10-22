import fs from "node:fs/promises";
import sharp from "sharp";

// Antoni Shkraba / Pexels 5493655. License and source in docs/service-photo-licenses.md.
const source = "https://images.pexels.com/photos/5493655/pexels-photo-5493655.jpeg?auto=compress&cs=tinysrgb&w=1800";
const response = await fetch(source, { signal: AbortSignal.timeout(30_000) });
if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) throw new Error(`Photo download failed: ${response.status}`);
const destination = "public/images/services/provider-painting.webp";
await sharp(Buffer.from(await response.arrayBuffer())).rotate().resize(1100, 950, { fit: "cover", position: "centre" }).webp({ quality: 82, effort: 6 }).toFile(destination);
console.log(JSON.stringify({ destination, bytes: (await fs.stat(destination)).size, width: 1100, height: 950 }));
