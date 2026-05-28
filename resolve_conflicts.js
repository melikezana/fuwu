const fs = require('fs');

const files = [
  'package.json',
  'src/app/admin/page.tsx',
  'src/app/admin/providers/page.tsx',
  'src/app/cerez-politikasi/page.tsx',
  'src/app/gizlilik/page.tsx',
  'src/app/kullanim-sartlari/page.tsx',
  'src/app/kvkk/page.tsx',
  'src/app/login/page.tsx',
  'src/app/provider-dashboard/page.tsx',
  'src/app/providers/[id]/page.tsx',
  'src/app/providers/page.tsx',
  'src/app/request/page.tsx',
  'src/components/home/FeatureSection.tsx',
  'src/components/home/HeroSection.tsx',
  'src/components/layout/Navbar.tsx',
  'src/components/providers/ProviderCard.tsx',
  'src/lib/i18n/index.ts',
  'src/lib/supabase/client.ts'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  // Keep the current-side content and remove conflicted-side content.
  
  const currentMarker = `${"<".repeat(7)} HEAD`;
  const separatorMarker = "=".repeat(7);
  const incomingMarker = `${">".repeat(7)} .*`;
  const regex = new RegExp(
    `${currentMarker}\\r?\\n([\\s\\S]*?)\\r?\\n${separatorMarker}\\r?\\n[\\s\\S]*?\\r?\\n${incomingMarker}\\r?\\n`,
    "g",
  );
  
  if (content.match(regex)) {
    content = content.replace(regex, '$1\n');
    fs.writeFileSync(file, content);
    console.log(`Resolved: ${file}`);
  } else {
    console.log(`No markers found or regex failed: ${file}`);
  }
});
