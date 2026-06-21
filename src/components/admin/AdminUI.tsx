import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentType, ReactNode } from "react";
import {
  AlertTriangle,
  ClipboardList,
  Eye,
  FileText,
  LayoutDashboard,
  MessageCircle,
  Power,
  PowerOff,
  ShieldAlert,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AdminNavKey = "dashboard" | "providers" | "applications" | "requests";

type IconComponent = ComponentType<{
  "aria-hidden"?: boolean;
  className?: string;
}>;

type AdminPageShellProps = {
  active: AdminNavKey;
  children: ReactNode;
  description: string;
  error?: string | null;
  isConfigured?: boolean;
  title: string;
};

type AdminActionButtonProps = {
  children: ReactNode;
  icon: IconComponent;
  tone?: "approve" | "neutral" | "reject";
} & ButtonHTMLAttributes<HTMLButtonElement>;

type AdminSummaryCardProps = {
  href: string;
  icon: IconComponent;
  label: string;
  value: number;
};

type AdminEmptyStateProps = {
  children: ReactNode;
  title: string;
};

const adminNavItems: Array<{
  href: string;
  icon: IconComponent;
  key: AdminNavKey;
  label: string;
}> = [
  {
    href: "/admin",
    icon: LayoutDashboard,
    key: "dashboard",
    label: "Genel Bakış",
  },
  {
    href: "/admin/providers",
    icon: Users,
    key: "providers",
    label: "Ustalar",
  },
  {
    href: "/admin/provider-applications",
    icon: ClipboardList,
    key: "applications",
    label: "Başvurular",
  },
  {
    href: "/admin/service-requests",
    icon: FileText,
    key: "requests",
    label: "Talepler",
  },
];

export const adminQuickNavItems = adminNavItems.slice(1);

export const adminActionIcons = {
  activate: Power,
  approve: UserCheck,
  detail: Eye,
  passive: PowerOff,
  reject: XCircle,
  message: MessageCircle,
  status: ClipboardList,
};

export function AdminPageShell({
  active,
  children,
  description,
  error,
  isConfigured = true,
  title,
}: AdminPageShellProps) {
  return (
    <div className="bg-[var(--surface-soft)]">
      <section className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase text-[var(--brand-orange-dark)]">
                Fuwu İç Operasyon
              </p>
              <h1 className="mt-2 text-3xl font-bold leading-tight text-[var(--brand-navy)] sm:text-4xl">
                {title}
              </h1>
              <p className="mt-3 max-w-3xl text-sm font-normal leading-6 text-[var(--muted)] sm:text-base">
                {description}
              </p>
            </div>
            <div className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-[rgba(255,138,0,0.28)] bg-[var(--brand-orange-soft)] px-3 py-2 text-xs font-medium leading-4 text-[var(--brand-orange-dark)]">
              <ShieldAlert className="h-4 w-4" aria-hidden />
              Yetkili admin alanı
            </div>
          </div>

          <nav
            className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible"
            aria-label="Admin menüsü"
          >
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.key;

              return (
                <Link
                  className={cn(
                    "inline-flex min-h-11 shrink-0 max-w-full items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold leading-5 shadow-[var(--shadow-subtle)] transition-colors",
                    isActive
                      ? "border-[rgba(255,138,0,0.58)] bg-[var(--brand-orange-soft)] text-[var(--brand-navy)]"
                      : "border-[var(--border)] bg-white text-[var(--brand-navy)] hover:border-[rgba(255,138,0,0.46)] hover:bg-[var(--brand-orange-soft)] hover:text-[var(--brand-orange-dark)]",
                  )}
                  href={item.href}
                  key={item.key}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      isActive ? "text-[var(--brand-orange-dark)]" : "text-current",
                    )}
                    aria-hidden
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </section>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <AdminAccessNotice error={error} isConfigured={isConfigured} />
        {children}
      </main>
    </div>
  );
}

export function AdminAccessNotice({
  error,
  isConfigured,
}: {
  error?: string | null;
  isConfigured: boolean;
}) {
  return (
    <div className="mb-6 rounded-lg border border-[rgba(255,138,0,0.26)] bg-white p-4 shadow-[var(--shadow-card)]">
      <div className="flex gap-3">
        <AlertTriangle
          className="mt-0.5 h-5 w-5 shrink-0 text-[var(--brand-orange-dark)]"
          aria-hidden
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--brand-navy)]">
            Yetkili admin alanı
          </p>
          <p className="mt-1 text-sm font-normal leading-6 text-[var(--muted)]">
            Bu alandaki canlı işlemler Supabase oturumu ve admin yetkisiyle
            çalışır; yetki olmadığında yönetim verileri korunur.
          </p>
          {!isConfigured ? (
            <p className="mt-2 text-sm font-medium text-[var(--brand-orange-dark)]">
              Supabase ortam değişkenleri tanımlı değil; canlı veri yerine boş
              yönetim görünümü gösteriliyor.
            </p>
          ) : null}
          {error ? (
            <p className="mt-2 text-sm font-medium text-[var(--brand-orange-dark)]">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function AdminSummaryCard({
  href,
  icon: Icon,
  label,
  value,
}: AdminSummaryCardProps) {
  return (
    <Link
      className="group rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-[rgba(255,138,0,0.52)] hover:bg-[var(--brand-orange-soft)] hover:shadow-[var(--shadow-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
      href={href}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--muted)]">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-[var(--brand-navy)]">
            {value}
          </p>
        </div>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-[var(--surface-soft)] text-[var(--brand-orange-dark)] transition-colors group-hover:bg-white">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

export function AdminActionButton({
  children,
  className,
  disabled = true,
  icon: Icon,
  title,
  tone = "neutral",
  type = "button",
  ...buttonProps
}: AdminActionButtonProps) {
  const enabledToneClasses = {
    approve:
      "border-[rgba(23,116,95,0.24)] bg-[var(--trust-green-soft)] text-[var(--trust-green)] hover:border-[rgba(23,116,95,0.42)] hover:bg-[#def2ea]",
    neutral:
      "border-[var(--border)] bg-white text-[var(--brand-navy)] hover:border-[rgba(255,138,0,0.42)] hover:bg-[var(--brand-orange-soft)]",
    reject: "border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100",
  };

  return (
    <button
      className={cn(
        "inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-center text-xs font-semibold leading-4 transition-colors disabled:opacity-75",
        disabled
          ? "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--muted)]"
          : enabledToneClasses[tone],
        className,
      )}
      disabled={disabled}
      title={title ?? (disabled ? "Bu işlem şu anda kapalı" : undefined)}
      type={type}
      {...buttonProps}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {children}
    </button>
  );
}

export function AdminEmptyState({ children, title }: AdminEmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--border)] bg-white p-8 text-center" role="status">
      <p className="text-base font-semibold text-[var(--brand-navy)]">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm font-normal leading-6 text-[var(--muted)]">
        {children}
      </p>
    </div>
  );
}

export function AdminStatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "green" | "neutral" | "orange" | "red";
}) {
  const toneClasses = {
    green: "border-[rgba(23,116,95,0.22)] bg-[var(--trust-green-soft)] text-[var(--trust-green)]",
    neutral: "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--muted)]",
    orange:
      "border-[rgba(255,138,0,0.25)] bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]",
    red: "border-red-200 bg-red-50 text-red-700",
  };

  return (
    <span
      className={cn(
        "inline-flex min-h-8 max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-medium leading-4",
        toneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}

export function AdminCardGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 lg:hidden">{children}</div>;
}

export function AdminTableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="hidden overflow-hidden rounded-lg border border-[var(--border)] bg-white shadow-[var(--shadow-card)] lg:block">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function AdminMobileCard({ children }: { children: ReactNode }) {
  return (
    <article className="min-w-0 rounded-lg border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-card)]">
      {children}
    </article>
  );
}
