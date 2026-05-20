export function EmptyAdminState({ 
  message 
}: { 
  message: string 
}) {
  return (
    <div className="py-8 px-4 text-center bg-[var(--surface-soft)] border border-dashed border-[var(--border)] rounded-md">
      <span className="text-sm font-semibold text-[var(--muted)]">{message}</span>
    </div>
  );
}
