// Reserve the first viewport while the catalog streams in; keep the footer below it.
export default function Loading() { return <div className="commerce-page min-h-screen" role="status" aria-label="Hizmetler yükleniyor"><div className="commerce-skeleton h-40" /><div className="commerce-service-grid mt-8">{[1,2,3].map(n => <div key={n} className="commerce-skeleton h-96" />)}</div></div>; }
