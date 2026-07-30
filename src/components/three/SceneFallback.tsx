import { SceneServiceLinks } from "@/components/three/SceneServiceLinks";
import { sceneServiceTargets } from "@/lib/constants/service-category-map";

export function SceneFallback() {
  return (
    <div
      className="relative h-full min-h-[320px] w-full overflow-hidden bg-[linear-gradient(145deg,#ffffff_0%,#fff7ed_50%,#eaf0f7_100%)]"
    >
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-[42%] h-36 w-44 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[rgba(20,33,61,0.12)] bg-white shadow-[var(--shadow-elevated)]"
      >
        <div className="absolute -top-11 left-1/2 h-24 w-24 -translate-x-1/2 rotate-45 rounded-md border border-[rgba(20,33,61,0.12)] bg-[var(--brand-navy-soft)]" />
        <div className="absolute inset-x-7 bottom-0 h-24 rounded-t-md bg-[var(--brand-orange-soft)]" />
        <div className="absolute bottom-0 left-1/2 h-16 w-9 -translate-x-1/2 rounded-t-md bg-[var(--brand-navy)]" />
        <div className="absolute bottom-14 left-8 h-8 w-8 rounded-md border border-[rgba(20,33,61,0.12)] bg-white" />
        <div className="absolute bottom-14 right-8 h-8 w-8 rounded-md border border-[rgba(20,33,61,0.12)] bg-white" />
      </div>

      {sceneServiceTargets.slice(0, 6).map((target, index) => {
        const positions = [
          "left-[10%] top-[18%]",
          "right-[12%] top-[16%]",
          "left-[9%] bottom-[30%]",
          "right-[10%] bottom-[32%]",
          "left-[40%] top-[8%]",
          "right-[35%] bottom-[22%]",
        ];

        return (
          <span
            className={`absolute ${positions[index]} inline-flex min-h-9 items-center rounded-md border border-[rgba(20,33,61,0.1)] bg-white/88 px-3 text-xs font-bold text-[var(--brand-navy)] shadow-[var(--shadow-subtle)]`}
            key={target.id}
          >
            {target.label}
          </span>
        );
      })}

      <SceneServiceLinks
        className="absolute inset-x-3 bottom-3 grid grid-cols-2 gap-2 sm:grid-cols-3"
        linkClassName="inline-flex min-h-10 min-w-0 items-center justify-between gap-2 rounded-md border border-[rgba(20,33,61,0.1)] bg-white/94 px-3 text-xs font-bold leading-4 text-[var(--brand-navy)] shadow-[var(--shadow-subtle)] transition-colors hover:border-[rgba(249,115,22,0.36)] hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
        showArrow
      />
    </div>
  );
}
