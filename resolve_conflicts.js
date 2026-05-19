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
  // We want to keep everything from <<<<<<< HEAD to =======, but remove the markers.
  // And remove everything from ======= to >>>>>>> commit.
  
  const regex = /<<<<<<< HEAD\r?\n([\s\S]*?)\r?\n=======\r?\n[\s\S]*?\r?\n>>>>>>> .*\r?\n/g;
  
  if (content.match(regex)) {
    content = content.replace(regex, '$1\n');
    fs.writeFileSync(file, content);
    console.log(`Resolved: ${file}`);
  } else {
    console.log(`No markers found or regex failed: ${file}`);
  }
});
