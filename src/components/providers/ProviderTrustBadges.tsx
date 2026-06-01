import { BadgeCheck, Clock3, IdCard, PhoneCall, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProviderTrustBadge } from "@/lib/providers/trust";

type ProviderTrustBadgesProps = {
  badges: ProviderTrustBadge[];
  className?: string;
  limit?: number;
};

const badgeIcons: Record<ProviderTrustBadge["id"], typeof ShieldCheck> = {
  "active-24h": Clock3,
  "fuwu-approved": ShieldCheck,
  "identity-verified": IdCard,
  "phone-verified": PhoneCall,
};

export function ProviderTrustBadges({
  badges,
  className,
  limit,
}: ProviderTrustBadgesProps) {
  const visibleBadges = typeof limit === "number" ? badges.slice(0, limit) : badges;

  if (visibleBadges.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex min-w-0 flex-wrap gap-1.5", className)}>
      {visibleBadges.map((badge) => {
        const Icon = badgeIcons[badge.id] ?? BadgeCheck;
        const toneClassName =
          badge.tone === "green"
            ? "border-[rgba(23,116,95,0.2)] bg-[var(--trust-green-soft)] text-[var(--trust-green)]"
            : "border-[rgba(255,138,0,0.24)] bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]";

        return (
          <span
            className={cn(
              "inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-md border px-2 py-1 text-[0.72rem] font-bold leading-4",
              toneClassName,
            )}
            key={badge.id}
          >
            <Icon aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="truncate">{badge.label}</span>
          </span>
        );
      })}
    </div>
  );
}
