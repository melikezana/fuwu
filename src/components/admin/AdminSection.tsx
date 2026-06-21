export function AdminSection({ 
  title, 
  description, 
  children 
}: { 
  title: string; 
  description?: string; 
  children: React.ReactNode; 
}) {
  return (
    <section className="mt-8 rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)] overflow-hidden">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-[var(--brand-navy)]">{title}</h2>
        {description && (
          <p className="mt-1 text-sm font-semibold text-[var(--muted)] leading-6">
            {description}
          </p>
        )}
      </div>
      <div className="overflow-x-auto pb-2 -mx-5 px-5">
        {children}
      </div>
    </section>
  );
}
