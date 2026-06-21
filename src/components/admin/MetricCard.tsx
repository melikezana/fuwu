export function MetricCard({ 
  label, 
  value, 
  subtext 
}: { 
  label: string; 
  value: string | number; 
  subtext?: string;
}) {
  return (
    <div className="flex min-w-[140px] flex-1 flex-col rounded-lg border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-subtle)]">
      <span className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">{label}</span>
      <span className="mt-2 text-2xl font-semibold text-[var(--brand-navy)]">{value}</span>
      {subtext && <span className="mt-1 text-xs font-medium text-[var(--muted)]">{subtext}</span>}
    </div>
  );
}
