import Link from "next/link";
import type { ReactNode } from "react";
import {
  BadgeCheck,
  ClipboardList,
  Eye,
  Inbox,
  LayoutDashboard,
  ShieldCheck,
  Star,
  UserRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/common/Button";
import { Container } from "@/components/common/Container";
import { appRoutes } from "@/constants/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type ProviderDashboardNavKey = "overview" | "profile" | "requests";

type ProviderDashboardShellProps = {
  active: ProviderDashboardNavKey;
  children: ReactNode;
  description: string;
  providerName?: string;
  title: string;
};

type ProviderDashboardRecord = Pick<
  Database["public"]["Tables"]["providers"]["Row"],
  | "id"
  | "name"
  | "phone"
  | "whatsapp"
  | "description"
  | "average_price_min"
  | "average_price_max"
  | "rating"
  | "is_active"
  | "is_approved"
> & {
  districts: ProviderRelation | ProviderRelation[] | null;
  service_categories: ProviderRelation | ProviderRelation[] | null;
};

type ProviderRelation = {
  name: string | null;
};

export type ProviderDashboardProfile = {
  averagePriceRange: string;
  category: string;
  description: string;
  district: string;
  id: string;
  isActive: boolean;
  isApproved: boolean;
  name: string;
  phone: string;
  rating: number;
  whatsapp: string;
};

type SummaryCardProps = {
  description: string;
  href: string;
  icon: LucideIcon;
  label: string;
  value: string;
};

type ProfileFieldProps = {
  label: string;
  value: string;
};

const providerSelectQuery = `
  id,
  name,
  phone,
  whatsapp,
  description,
  average_price_min,
  average_price_max,
  rating,
  is_active,
  is_approved,
  service_categories(name),
  districts(name)
`;

const providerNavItems: Array<{
  href: string;
  icon: LucideIcon;
  key: ProviderDashboardNavKey;
  label: string;
}> = [
  {
    href: appRoutes.providerDashboard,
    icon: LayoutDashboard,
    key: "overview",
    label: "Genel Bakış",
  },
  {
    href: appRoutes.providerDashboardProfile,
    icon: UserRound,
    key: "profile",
    label: "Profil",
  },
  {
    href: appRoutes.providerDashboardRequests,
    icon: ClipboardList,
    key: "requests",
    label: "Talepler",
  },
];

function getRelationName(relation: ProviderRelation | ProviderRelation[] | null | undefined) {
  if (Array.isArray(relation)) {
    return relation[0]?.name?.trim() ?? "";
  }

  return relation?.name?.trim() ?? "";
}

function parsePrice(value: number | string | null) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatAveragePriceRange(
  minimumPriceValue: number | string | null,
  maximumPriceValue: number | string | null,
) {
  const minimumPrice = parsePrice(minimumPriceValue);
  const maximumPrice = parsePrice(maximumPriceValue);

  if (typeof minimumPrice === "number" && typeof maximumPrice === "number") {
    return `${formatPrice(minimumPrice)} - ${formatPrice(maximumPrice)} TL`;
  }

  if (typeof minimumPrice === "number") {
    return `${formatPrice(minimumPrice)} TL ve üzeri`;
  }

  if (typeof maximumPrice === "number") {
    return `${formatPrice(maximumPrice)} TL'ye kadar`;
  }

  return "Fiyat görüşmede netleşir";
}

export function formatProviderRating(rating: number) {
  return Number.isFinite(rating)
    ? rating.toLocaleString("tr-TR", {
        maximumFractionDigits: 1,
        minimumFractionDigits: 1,
      })
    : "0,0";
}

function mapProviderDashboardRecord(
  record: ProviderDashboardRecord,
): ProviderDashboardProfile | null {
  const category = getRelationName(record.service_categories);
  const district = getRelationName(record.districts);

  if (!category || !district) {
    return null;
  }

  return {
    averagePriceRange: formatAveragePriceRange(
      record.average_price_min,
      record.average_price_max,
    ),
    category,
    description:
      record.description?.trim() ||
      "Profil açıklaması Fuwu operasyon ekibi tarafından tamamlanacak.",
    district,
    id: record.id,
    isActive: record.is_active,
    isApproved: record.is_approved,
    name: record.name,
    phone: record.phone,
    rating: Number(record.rating ?? 0),
    whatsapp: record.whatsapp?.trim() || record.phone,
  };
}

export async function getProviderDashboardProfile() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id) {
    return null;
  }

  const { data, error } = await supabase
    .from("providers")
    .select(providerSelectQuery)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .eq("is_approved", true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapProviderDashboardRecord(data as unknown as ProviderDashboardRecord);
}

export function ProviderDashboardShell({
  active,
  children,
  description,
  providerName,
  title,
}: ProviderDashboardShellProps) {
  return (
    <div className="min-h-full bg-[var(--surface-soft)]">
      <section className="border-b border-[var(--border)] bg-white">
        <Container className="max-w-7xl py-8 sm:py-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 cursor-default select-none">
              <p className="text-xs font-black uppercase text-[var(--brand-orange-dark)]">
                Fuwu Usta Paneli
              </p>
              <h1 className="mt-2 text-3xl font-black leading-tight text-[var(--brand-navy)] sm:text-4xl">
                {title}
              </h1>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[var(--muted)] sm:text-base">
                {description}
              </p>
            </div>

            <div className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-md border border-[rgba(23,116,95,0.2)] bg-[var(--trust-green-soft)] px-3 py-2 text-xs font-black leading-4 text-[var(--trust-green)]">
              <ShieldCheck className="h-4 w-4" aria-hidden />
              {providerName ? `${providerName} alanı` : "Hazırlık alanı"}
            </div>
          </div>

          <nav className="mt-6 flex flex-wrap gap-2 pb-1" aria-label="Usta paneli menüsü">
            {providerNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.key;

              return (
                <Link
                  className={cn(
                    "inline-flex min-h-11 max-w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-black leading-5 transition-colors",
                    isActive
                      ? "bg-[var(--brand-navy)] text-white"
                      : "bg-[var(--surface-soft)] text-[var(--muted)] hover:bg-[var(--brand-orange-soft)] hover:text-[var(--brand-navy)]",
                  )}
                  href={item.href}
                  key={item.key}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </Container>
      </section>

      <Container className="max-w-7xl py-6 sm:py-8">{children}</Container>
    </div>
  );
}

export function ProviderDashboardAccessPlaceholder() {
  return (
    <section className="rounded-lg border border-[rgba(255,138,0,0.28)] bg-white p-6 shadow-[0_18px_54px_rgba(13,20,36,0.07)] sm:p-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0 cursor-default select-none">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]">
            <BadgeCheck className="h-6 w-6" aria-hidden />
          </div>
          <h2 className="mt-5 text-3xl font-black leading-tight text-[var(--brand-navy)]">
            Usta paneli yakında aktif olacak.
          </h2>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[var(--muted)] sm:text-base sm:leading-7">
            Onaylı usta hesabı bağlandığında profil bilgileri, görünürlük durumu ve gelen talepler
            bu alandan yönetilecek.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <Button className="w-full sm:w-fit" href={appRoutes.providerApplication}>
            Usta Olarak Başvur
          </Button>
          <Button className="w-full sm:w-fit" href={appRoutes.providers} variant="secondary">
            Ustaları Gör
          </Button>
        </div>
      </div>
    </section>
  );
}

export function ProviderSummaryCard({
  description,
  href,
  icon: Icon,
  label,
  value,
}: SummaryCardProps) {
  return (
    <Link
      className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[0_14px_40px_rgba(13,20,36,0.06)] transition-colors hover:border-[rgba(255,138,0,0.42)] hover:bg-[var(--brand-orange-soft)]"
      href={href}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 cursor-default select-none">
          <p className="text-sm font-black text-[var(--muted)]">{label}</p>
          <p className="mt-3 text-2xl font-black leading-tight text-[var(--brand-navy)]">
            {value}
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--muted)]">
            {description}
          </p>
        </div>
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[var(--surface-soft)] text-[var(--brand-orange-dark)]">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

export function ProviderProfileField({ label, value }: ProfileFieldProps) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-4">
      <p className="cursor-default select-none text-xs font-black uppercase text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-2 cursor-default select-none break-words text-base font-black leading-6 text-[var(--brand-navy)]">
        {value}
      </p>
    </div>
  );
}

export function ProviderStatusBadge({
  children,
  tone = "green",
}: {
  children: ReactNode;
  tone?: "green" | "orange";
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 max-w-full items-center rounded-md border px-2.5 py-1 text-xs font-black leading-4",
        tone === "green"
          ? "border-[rgba(23,116,95,0.22)] bg-[var(--trust-green-soft)] text-[var(--trust-green)]"
          : "border-[rgba(255,138,0,0.25)] bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]",
      )}
    >
      {children}
    </span>
  );
}

export function ProviderRequestsEmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-[rgba(255,138,0,0.38)] bg-[linear-gradient(180deg,#ffffff_0%,#fffaf3_100%)] p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]">
        <Inbox className="h-6 w-6" aria-hidden />
      </div>
      <h2 className="mt-5 text-xl font-black text-[var(--brand-navy)]">
        Henüz gelen talep bulunmuyor.
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-[var(--muted)]">
        Müşteri talepleri usta hesabına bağlandığında burada sırayla görünecek.
      </p>
    </div>
  );
}

export const providerDashboardIcons = {
  eye: Eye,
  inbox: Inbox,
  shield: ShieldCheck,
  star: Star,
  user: UserRound,
  wallet: WalletCards,
};
