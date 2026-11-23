import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEMO_LABEL } from "@/lib/demo/providers";

/** Örnek profilin her yüzeyinde görünen, gözden kaçmayan etiket. */
export function DemoBadge({ className, tone = "solid" }: { className?: string; tone?: "solid" | "soft" }) {
  return (
    <span className={cn("demo-badge", tone === "soft" && "is-soft", className)}>
      <FlaskConical aria-hidden size={14} />
      {DEMO_LABEL} profil
    </span>
  );
}
