import fs from "fs";
import path from "path";
import sharp from "sharp";

async function generateIcons() {
  const rootDir = process.cwd();
  const iconsDir = path.join(rootDir, "public", "icons");
  const sourceSvgPath = path.join(iconsDir, "fuwu-icon-512.svg");

  if (!fs.existsSync(sourceSvgPath)) {
    throw new Error(`Source SVG file not found at: ${sourceSvgPath}`);
  }

  let svgContent = fs.readFileSync(sourceSvgPath, "utf-8");

  // Ensure edge-to-edge solid background fill without rounded corners (no rx attribute)
  svgContent = svgContent.replace(/rx="\d+"/g, "");

  const svgBuffer = Buffer.from(svgContent);

  const targets = [
    { name: "fuwu-icon-180.png", size: 180 },
    { name: "fuwu-icon-192.png", size: 192 },
    { name: "fuwu-icon-512.png", size: 512 },
  ];

  console.log("Generating PNG icons from SVG source...");

  for (const target of targets) {
    const outputPath = path.join(iconsDir, target.name);
    await sharp(svgBuffer)
      .resize(target.size, target.size)
      .png({ quality: 100 })
      .toFile(outputPath);

    console.log(`Generated: ${target.name} (${target.size}x${target.size})`);
  }

  console.log("All PNG icons successfully generated in public/icons/");
}

generateIcons().catch((err) => {
  console.error("Error generating icons:", err);
  process.exit(1);
});
