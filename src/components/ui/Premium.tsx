import type { ComponentType, HTMLAttributes, ReactNode } from "react";
import { ArrowRight, CheckCircle2, Info, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type IconComponent = ComponentType<{
  "aria-hidden"?: boolean | "true";
  className?: string;
}>;

type PageHeaderProps = {
  actions?: ReactNode;
  badge?: string;
  breadcrumbs?: ReactNode;
  description: ReactNode;
  eyebrow: ReactNode;
  metrics?: Array<{
    icon?: IconComponent;
    label: ReactNode;
    value: ReactNode;
  }>;
  title: ReactNode;
};

type PremiumCardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  interactive?: boolean;
};

type MetricCardProps = {
  description?: ReactNode;
  icon?: IconComponent;
  label: ReactNode;
  value: ReactNode;
};

type EmptyStateProps = {
  actionHref?: string;
  actionLabel?: string;
  description: ReactNode;
  icon?: IconComponent;
  title: ReactNode;
};

type StatusBadgeProps = {
  children: ReactNode;
  tone?: "danger" | "info" | "neutral" | "success" | "warning";
};

const badgeToneClasses = {
  danger: "border-red-200 bg-red-50 text-red-700",
  info: "border-[rgba(20,33,61,0.12)] bg-[var(--brand-navy-soft)] text-[var(--brand-navy)]",
  neutral: "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--muted)]",
  success: "border-[rgba(23,135,93,0.22)] bg-[var(--trust-green-soft)] text-[var(--trust-green)]",
  warning:
    "border-[rgba(249,115,22,0.28)] bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]",
};

export function PremiumCard({
  children,
  className,
  interactive = false,
  ...props
}: PremiumCardProps) {
  return (
    <div
      className={cn(
        "premium-card p-5 sm:p-6",
        interactive ? "premium-card-hover" : undefined,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function StatusBadge({ children, tone = "neutral" }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold leading-4",
        badgeToneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  actions,
  badge,
  breadcrumbs,
  description,
  eyebrow,
  metrics,
  title,
}: PageHeaderProps) {
  return (
    <section className="premium-page-band relative overflow-hidden">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        {breadcrumbs ? (
          <nav
            aria-label="Breadcrumb"
            className="mb-5 flex flex-wrap items-center gap-2 text-sm font-semibold text-[var(--muted)]"
          >
            {breadcrumbs}
          </nav>
        ) : null}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <div className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[rgba(249,115,22,0.24)] bg-[var(--brand-orange-soft)] px-3 py-1 text-xs font-bold uppercase text-[var(--brand-orange-dark)]">
              <ShieldCheck className="size-4" aria-hidden="true" />
              {eyebrow}
            </div>
            <h1 className="mt-4 max-w-4xl text-3xl font-bold leading-tight text-[var(--brand-navy)] sm:text-4xl lg:text-5xl">
              {title}
            </h1>
            <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-[var(--muted)] sm:text-base sm:leading-7">
              {description}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
            {badge ? <StatusBadge tone="warning">{badge}</StatusBadge> : null}
            {actions}
          </div>
        </div>
        {metrics?.length ? (
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {metrics.map((metric) => {
              const Icon = metric.icon ?? CheckCircle2;

              return (
                <div
                  className="rounded-lg border border-[rgba(20,33,61,0.08)] bg-white px-4 py-3 shadow-[var(--shadow-subtle)]"
                  key={`${metric.label}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xl font-bold leading-none text-[var(--brand-navy)]">
                        {metric.value}
                      </span>
                      <span className="mt-1 block text-xs font-semibold leading-4 text-[var(--muted)]">
                        {metric.label}
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function MetricCard({ description, icon: Icon = Info, label, value }: MetricCardProps) {
  return (
    <PremiumCard interactive>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-[var(--brand-orange-dark)]">{label}</p>
          <p className="mt-3 text-2xl font-bold leading-tight text-[var(--brand-navy)]">
            {value}
          </p>
          {description ? (
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--muted)]">
              {description}
            </p>
          ) : null}
        </div>
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
    </PremiumCard>
  );
}

export function EmptyState({
  actionHref,
  actionLabel,
  description,
  icon: Icon = Search,
  title,
}: EmptyStateProps) {
  return (
    <PremiumCard className="text-center" role="status">
      <div className="mx-auto flex size-14 items-center justify-center rounded-md bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]">
        <Icon className="size-6" aria-hidden="true" />
      </div>
      <h2 className="mt-5 text-xl font-bold leading-tight text-[var(--brand-navy)]">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-[var(--muted)]">
        {description}
      </p>
      {actionHref && actionLabel ? (
        <Button className="mt-6 w-full gap-2 sm:w-fit" href={actionHref}>
          {actionLabel}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      ) : null}
    </PremiumCard>
  );
}
