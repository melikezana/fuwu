// Tek serili, doğrudan etiketli yatay çubuk grafik (bağımlılık yok, saf JSX).
// Tek renk (marka turuncusu) kullanır: kategorik renk doğrulaması gerekmez.

type BarDatum = { label: string; value: number };

type BarChartProps = {
  data: Record<string, number> | BarDatum[];
  emptyLabel?: string;
  maxItems?: number;
  title: string;
};

function normalize(data: BarChartProps["data"]): BarDatum[] {
  if (Array.isArray(data)) return data;
  return Object.entries(data).map(([label, value]) => ({ label, value }));
}

export function BarChart({
  data,
  emptyLabel = "Veri yok.",
  maxItems = 8,
  title,
}: BarChartProps) {
  const all = normalize(data)
    .filter((d) => Number.isFinite(d.value))
    .sort((a, b) => b.value - a.value);

  let rows = all;
  if (all.length > maxItems) {
    const head = all.slice(0, maxItems - 1);
    const restTotal = all.slice(maxItems - 1).reduce((sum, d) => sum + d.value, 0);
    rows = [...head, { label: "Diğer", value: restTotal }];
  }

  const max = rows.reduce((m, d) => Math.max(m, d.value), 0);

  return (
    <figure className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-subtle)]">
      <figcaption className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
        {title}
      </figcaption>

      {rows.length === 0 || max === 0 ? (
        <p className="py-4 text-sm font-semibold text-[var(--muted)]">{emptyLabel}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => {
            const pct = max === 0 ? 0 : Math.round((row.value / max) * 100);
            return (
              <li key={row.label} className="flex items-center gap-3">
                <span
                  className="w-28 shrink-0 truncate text-right text-xs font-semibold text-[var(--brand-navy)]"
                  title={row.label}
                >
                  {row.label}
                </span>
                <span
                  aria-hidden
                  className="relative h-5 flex-1 overflow-hidden rounded-full bg-[var(--surface-soft)]"
                >
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-[var(--brand-orange)]"
                    style={{ width: `${Math.max(pct, row.value > 0 ? 4 : 0)}%` }}
                  />
                </span>
                <span className="w-10 shrink-0 text-sm font-bold text-[var(--brand-navy)]">
                  {row.value}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </figure>
  );
}
