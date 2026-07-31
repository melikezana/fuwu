export function SceneFallback() {
  return (
    <div className="relative h-full min-h-[320px] w-full overflow-visible">
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-[78%] w-[88%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[linear-gradient(180deg,#FFFFFF_0%,#FFFDF9_100%)] shadow-[0_42px_96px_rgba(10,37,64,0.16)] ring-1 ring-[rgba(10,37,64,0.06)]"
      />
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-[44%] h-56 w-72 -translate-x-1/2 -translate-y-1/2 rounded-md bg-white shadow-[0_28px_72px_rgba(10,37,64,0.16)] ring-1 ring-[rgba(10,37,64,0.08)]"
      >
        <div className="absolute inset-x-4 top-1/2 h-px bg-[var(--border)]" />
        <div className="absolute bottom-4 left-1/2 top-5 w-px bg-[var(--border)]" />
        <div className="absolute bottom-4 left-4 top-5 w-px bg-[var(--border)]" />
        <div className="absolute bottom-4 right-4 top-5 w-px bg-[var(--border)]" />

        <div className="absolute -top-14 left-1/2 h-28 w-28 -translate-x-1/2 rotate-45 rounded-md border border-[rgba(10,37,64,0.08)] bg-[#FFFDF9] shadow-[var(--shadow-card)]" />

        <div className="absolute bottom-5 left-8 h-8 w-16 rounded-md bg-[var(--brand-orange-soft)] shadow-[var(--shadow-subtle)]" />
        <div className="absolute bottom-8 left-24 h-7 w-14 rounded-md bg-[#FFFDF9]" />
        <div className="absolute bottom-6 right-8 h-10 w-[4.5rem] rounded-md bg-white shadow-[var(--shadow-subtle)]" />
        <div className="absolute left-8 top-10 h-8 w-14 rounded-md bg-[#FFFDF9]" />
        <div className="absolute left-24 top-9 h-9 w-16 rounded-md bg-white shadow-[var(--shadow-subtle)] ring-1 ring-[var(--border)]" />
        <div className="absolute right-9 top-9 h-9 w-14 rounded-md bg-[var(--brand-orange-soft)]" />

        <div className="absolute bottom-0 left-1/2 h-16 w-9 -translate-x-1/2 rounded-t-md bg-[var(--brand-navy)]" />
        <div className="absolute bottom-16 left-8 h-8 w-8 rounded-md border border-[rgba(10,37,64,0.12)] bg-white" />
        <div className="absolute bottom-16 right-8 h-8 w-8 rounded-md border border-[rgba(10,37,64,0.12)] bg-white" />
      </div>
    </div>
  );
}
