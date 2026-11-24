import type { LegalSection } from "@/lib/legal/distance-contract";

/** Sözleşme metinleri en az 12 punto (16 px) gösterilir (Mesafeli Sözleşmeler Yönetmeliği m.6/1). */
export function LegalDocument({ title, sections, note, id }: { title: string; sections: LegalSection[]; note?: string; id?: string }) {
  return <article className="legal-doc" id={id} aria-label={title}>
    <h2>{title}</h2>
    {note && <p className="legal-doc-note">{note}</p>}
    {sections.map(section => <section key={section.title}><h3>{section.title}</h3>{section.body.map((line, index) => <p key={index}>{line}</p>)}</section>)}
  </article>;
}
