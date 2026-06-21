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
    <section className="mt-8 overflow-hidden rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-[var(--brand-navy)]">{title}</h2>
        {description && (
          <p className="mt-1 text-sm font-normal leading-6 text-[var(--muted)]">
            {description}
          </p>
        )}
      </div>
      <div className="-mx-5 overflow-x-auto px-5 pb-2">
        {children}
      </div>
    </section>
  );
}
