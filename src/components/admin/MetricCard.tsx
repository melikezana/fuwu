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
    <div className="flex flex-col bg-white border border-[var(--border)] rounded-lg p-4 shadow-sm min-w-[140px] flex-1">
      <span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">{label}</span>
      <span className="text-2xl font-black text-[var(--brand-navy)] mt-2">{value}</span>
      {subtext && <span className="text-xs font-semibold text-[var(--muted)] mt-1">{subtext}</span>}
    </div>
  );
}
