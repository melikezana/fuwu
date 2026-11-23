/**
 * Belge küçük resmi. Gerçek bir belgenin kopyası DEĞİLDİR: kurum logosu, mühür, numara ya da imza
 * taşımaz; yalnızca belge türünü gösteren sade bir çizimdir ve üzerinde çapraz "ÖRNEK" yazısı vardır.
 */
export function DemoDocumentThumb({ title }: { title: string }) {
  const words = title.split(" ");
  const lines: string[] = [];
  for (const word of words) {
    const last = lines[lines.length - 1];
    if (last && (last + " " + word).length <= 22) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return (
    <svg aria-hidden className="demo-doc-thumb" viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="118" height="158" rx="8" fill="#fff" stroke="var(--border)" strokeWidth="2" />
      <rect x="12" y="14" width="96" height="6" rx="3" fill="var(--brand-navy)" opacity=".85" />
      {lines.slice(0, 4).map((line, index) => (
        <text key={line} x="60" y={36 + index * 10} textAnchor="middle" fontSize="7.4" fontWeight="700" fill="var(--brand-navy)">{line}</text>
      ))}
      {[84, 94, 104, 114].map(y => <rect key={y} x="18" y={y} width={y === 114 ? 52 : 84} height="4" rx="2" fill="var(--border)" />)}
      <rect x="18" y="130" width="34" height="4" rx="2" fill="var(--border)" />
      <rect x="70" y="130" width="32" height="4" rx="2" fill="var(--border)" />
      <g transform="rotate(-28 60 80)">
        <rect x="6" y="66" width="108" height="28" rx="6" fill="var(--brand-orange)" opacity=".9" />
        <text x="60" y="86" textAnchor="middle" fontSize="17" fontWeight="800" letterSpacing="3" fill="#fff">ÖRNEK</text>
      </g>
    </svg>
  );
}
