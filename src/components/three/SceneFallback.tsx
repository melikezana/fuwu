export function SceneFallback() {
  const items = ["Anahtar", "Matkap", "Boya", "Elektrik", "Klima", "Tesisat"];

  return (
    <div
      aria-hidden="true"
      className="relative h-full min-h-[320px] w-full overflow-hidden bg-[linear-gradient(145deg,#ffffff_0%,#fff7ed_50%,#eaf0f7_100%)]"
    >
      <div className="absolute left-1/2 top-1/2 h-36 w-44 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[rgba(20,33,61,0.12)] bg-white shadow-[var(--shadow-elevated)]">
        <div className="absolute -top-11 left-1/2 h-24 w-24 -translate-x-1/2 rotate-45 rounded-md border border-[rgba(20,33,61,0.12)] bg-[var(--brand-navy-soft)]" />
        <div className="absolute inset-x-7 bottom-0 h-24 rounded-t-md bg-[var(--brand-orange-soft)]" />
        <div className="absolute bottom-0 left-1/2 h-16 w-9 -translate-x-1/2 rounded-t-md bg-[var(--brand-navy)]" />
        <div className="absolute bottom-14 left-8 h-8 w-8 rounded-md border border-[rgba(20,33,61,0.12)] bg-white" />
        <div className="absolute bottom-14 right-8 h-8 w-8 rounded-md border border-[rgba(20,33,61,0.12)] bg-white" />
      </div>

      {items.map((item, index) => {
        const positions = [
          "left-[10%] top-[18%]",
          "right-[12%] top-[16%]",
          "left-[9%] bottom-[20%]",
          "right-[10%] bottom-[22%]",
          "left-[40%] top-[8%]",
          "right-[35%] bottom-[8%]",
        ];

        return (
          <span
            className={`absolute ${positions[index]} inline-flex min-h-9 items-center rounded-md border border-[rgba(20,33,61,0.1)] bg-white/88 px-3 text-xs font-bold text-[var(--brand-navy)] shadow-[var(--shadow-subtle)]`}
            key={item}
          >
            {item}
          </span>
        );
      })}
    </div>
  );
}
