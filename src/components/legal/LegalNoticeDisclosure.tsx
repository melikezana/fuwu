import type { LegalNotice } from "@/lib/legal/notices";

// Aydınlatma metni formdan ayrılmadan okunur (sayfa değiştirmez); tam metin istenirse yeni sekmede açılır.
export function LegalNoticeDisclosure({ notice, summary }: { notice: LegalNotice; summary: string }) {
  const headingId = `${notice.id}-notice-title`;
  return (
    <section className="legal-block" aria-labelledby={headingId}>
      <h3 id={headingId} className="legal-block-title">{notice.title}</h3>
      <p className="legal-block-summary">{summary}</p>
      <details className="legal-disclosure">
        <summary>Metni oku</summary>
        <div className="legal-disclosure-body" tabIndex={0} aria-label={notice.title}>
          {notice.sections.map(section => (
            <div key={section.title}>
              <h4>{section.title}</h4>
              {section.body.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
            </div>
          ))}
          <p className="legal-meta">Sürüm: {notice.version} · Güncelleme: {notice.updated}</p>
        </div>
      </details>
      <a className="legal-newtab" href={`/kvkk#${notice.id}`} target="_blank" rel="noopener">Tam metni yeni sekmede aç</a>
    </section>
  );
}
