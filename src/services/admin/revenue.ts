import type { SupabaseClient } from "@supabase/supabase-js";
import { handleServiceError } from "@/lib/errors";
import {
  LEGACY_SERVICE_REQUEST_STATUSES,
  SERVICE_REQUEST_STATUSES,
} from "@/lib/constants/statuses";
import type { Database } from "@/lib/supabase/types";
import { hasAdminRole } from "@/services/auth/constants";
import { getServerAuthContext } from "@/services/auth/server";
import { PAYMENT_STATUSES } from "@/services/payments/constants";

type AdminSupabaseClient = SupabaseClient<Database>;

type AdminGate =
  | { isConfigured: boolean; ok: false; supabase: null; userId: null }
  | { isConfigured: true; ok: true; supabase: AdminSupabaseClient; userId: string };

type NamedRelation = { name: string | null };
type MaybeNamedRelation = NamedRelation | NamedRelation[] | null;

type RevenueRequestRelation =
  | {
      category_id: string | null;
      district_id: string | null;
      districts: MaybeNamedRelation;
      offered_price: number | string | null;
      service_categories: MaybeNamedRelation;
    }
  | Array<{
      category_id: string | null;
      district_id: string | null;
      districts: MaybeNamedRelation;
      offered_price: number | string | null;
      service_categories: MaybeNamedRelation;
    }>
  | null;

type ReleasedPaymentRecord = {
  amount: number | string | null;
  commission_amount: number | string | null;
  confirmed_at: string | null;
  created_at: string;
  escrow_released_at: string | null;
  id: string;
  service_requests: RevenueRequestRelation;
};

type DistrictDemandRecord = {
  district_id: string | null;
  districts: MaybeNamedRelation;
  id: string;
};

type DistrictProviderRecord = {
  district_id: string | null;
  districts: MaybeNamedRelation;
  id: string;
};

export type MonthlyCommissionRevenue = {
  commissionRevenue: number;
  month: string;
  monthKey: string;
  monthStart: string;
  paymentCount: number;
};

export type RevenueBreakdownItem = {
  commissionRevenue: number;
  gmv: number;
  id: string;
  label: string;
  paymentCount: number;
};

export type GmvVsCommissionItem = {
  commissionRate: number;
  commissionRevenue: number;
  gmv: number;
  month: string;
  monthKey: string;
  monthStart: string;
  paymentCount: number;
};

export type SupplyDemandGapItem = {
  activeApprovedProviderCount: number;
  district: string;
  districtId: string;
  gap: number;
  openDemandCount: number;
  opportunity: boolean;
};

export type AdminRevenueDashboardData = {
  error: string | null;
  gmvVsCommission: GmvVsCommissionItem[];
  isConfigured: boolean;
  monthlyCommission: MonthlyCommissionRevenue[];
  revenueByCategory: RevenueBreakdownItem[];
  revenueByDistrict: RevenueBreakdownItem[];
  supplyDemandGap: SupplyDemandGapItem[];
};

const MONTH_WINDOW = 12;
const PAGE_SIZE = 1000;
const UNKNOWN_CATEGORY_ID = "unknown-category";
const UNKNOWN_DISTRICT_ID = "unknown-district";

const releasedPaymentSelect = `
  id,
  amount,
  commission_amount,
  escrow_released_at,
  confirmed_at,
  created_at,
  service_requests(
    category_id,
    district_id,
    offered_price,
    service_categories(name),
    districts(name)
  )
`;

const openDemandStatuses = [
  SERVICE_REQUEST_STATUSES.pending,
  SERVICE_REQUEST_STATUSES.rejected,
  LEGACY_SERVICE_REQUEST_STATUSES.open,
  LEGACY_SERVICE_REQUEST_STATUSES.yeni,
  LEGACY_SERVICE_REQUEST_STATUSES.inceleniyor,
];

async function adminGate(): Promise<AdminGate> {
  const ctx = await getServerAuthContext();
  if (!ctx.supabase || !ctx.user || !hasAdminRole(ctx.profile)) {
    return { isConfigured: ctx.isConfigured, ok: false, supabase: null, userId: null };
  }

  return { isConfigured: true, ok: true, supabase: ctx.supabase, userId: ctx.user.id };
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function normalizeMoney(value: number) {
  return Number(value.toFixed(2));
}

function normalizePercent(value: number) {
  return Number(value.toFixed(2));
}

function getRelationName(relation: MaybeNamedRelation, fallback = "Belirtilmedi") {
  const record = Array.isArray(relation) ? relation[0] : relation;

  return record?.name?.trim() || fallback;
}

function getRequest(relation: RevenueRequestRelation) {
  return Array.isArray(relation) ? relation[0] : relation;
}

function getMonthStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function getMonthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(date);
}

function getMonthWindows(referenceDate = new Date()) {
  const currentMonthStart = getMonthStart(referenceDate);

  return Array.from({ length: MONTH_WINDOW }, (_, index) => {
    const monthOffset = index - (MONTH_WINDOW - 1);

    return new Date(
      Date.UTC(
        currentMonthStart.getUTCFullYear(),
        currentMonthStart.getUTCMonth() + monthOffset,
        1,
      ),
    );
  });
}

function createMonthlyCommissionRows(referenceDate = new Date()) {
  return getMonthWindows(referenceDate).map((monthDate) => ({
    commissionRevenue: 0,
    month: getMonthLabel(monthDate),
    monthKey: getMonthKey(monthDate),
    monthStart: monthDate.toISOString(),
    paymentCount: 0,
  }));
}

function createGmvVsCommissionRows(referenceDate = new Date()) {
  return createMonthlyCommissionRows(referenceDate).map((month) => ({
    ...month,
    commissionRate: 0,
    gmv: 0,
  }));
}

function getPaymentRevenueDate(payment: ReleasedPaymentRecord) {
  return payment.escrow_released_at ?? payment.confirmed_at ?? payment.created_at;
}

function getPaymentMonthKey(payment: ReleasedPaymentRecord) {
  const revenueDate = new Date(getPaymentRevenueDate(payment));

  return Number.isFinite(revenueDate.getTime()) ? getMonthKey(revenueDate) : null;
}

function getPaymentGmv(payment: ReleasedPaymentRecord) {
  const request = getRequest(payment.service_requests);
  const offeredPrice = toNumber(request?.offered_price);

  return offeredPrice > 0 ? offeredPrice : toNumber(payment.amount);
}

async function queryReleasedRevenuePayments(supabase: AdminSupabaseClient) {
  const windowStart = getMonthWindows()[0].toISOString();
  const rows: ReleasedPaymentRecord[] = [];

  for (let from = 0; from < 100000; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("payments")
      .select(releasedPaymentSelect)
      .eq("status", PAYMENT_STATUSES.escrowReleased)
      .or(
        `escrow_released_at.gte.${windowStart},confirmed_at.gte.${windowStart},created_at.gte.${windowStart}`,
      )
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    const pageRows = (data ?? []) as unknown as ReleasedPaymentRecord[];
    rows.push(...pageRows);

    if (pageRows.length < PAGE_SIZE) {
      break;
    }
  }

  return rows;
}

async function querySupplyDemandGap(supabase: AdminSupabaseClient) {
  const [demandRecords, providerRecords] = await Promise.all([
    queryDistrictDemandRecords(supabase),
    queryDistrictProviderRecords(supabase),
  ]);
  const districtMap = new Map<
    string,
    {
      activeApprovedProviderCount: number;
      district: string;
      districtId: string;
      openDemandCount: number;
    }
  >();

  function getDistrict(
    districtId: string | null,
    relation: MaybeNamedRelation,
    fallbackId: string,
  ) {
    const id = districtId ?? fallbackId;
    const current = districtMap.get(id);

    if (current) {
      return current;
    }

    const district = {
      activeApprovedProviderCount: 0,
      district: getRelationName(relation),
      districtId: id,
      openDemandCount: 0,
    };

    districtMap.set(id, district);

    return district;
  }

  for (const demand of demandRecords) {
    getDistrict(demand.district_id, demand.districts, UNKNOWN_DISTRICT_ID)
      .openDemandCount += 1;
  }

  for (const provider of providerRecords) {
    getDistrict(provider.district_id, provider.districts, UNKNOWN_DISTRICT_ID)
      .activeApprovedProviderCount += 1;
  }

  return Array.from(districtMap.values())
    .map((item) => {
      const gap = item.openDemandCount - item.activeApprovedProviderCount;

      return {
        ...item,
        gap,
        opportunity: item.openDemandCount > 0 && item.activeApprovedProviderCount === 0,
      };
    })
    .sort(
      (a, b) =>
        Number(b.opportunity) - Number(a.opportunity) ||
        b.gap - a.gap ||
        b.openDemandCount - a.openDemandCount ||
        a.district.localeCompare(b.district, "tr"),
    );
}

async function queryDistrictDemandRecords(supabase: AdminSupabaseClient) {
  const rows: DistrictDemandRecord[] = [];

  for (let from = 0; from < 100000; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("service_requests")
      .select("id, district_id, districts(name)")
      .in("status", openDemandStatuses)
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    const pageRows = (data ?? []) as unknown as DistrictDemandRecord[];
    rows.push(...pageRows);

    if (pageRows.length < PAGE_SIZE) {
      break;
    }
  }

  return rows;
}

async function queryDistrictProviderRecords(supabase: AdminSupabaseClient) {
  const rows: DistrictProviderRecord[] = [];

  for (let from = 0; from < 100000; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("providers")
      .select("id, district_id, districts(name)")
      .eq("is_active", true)
      .eq("is_approved", true)
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    const pageRows = (data ?? []) as unknown as DistrictProviderRecord[];
    rows.push(...pageRows);

    if (pageRows.length < PAGE_SIZE) {
      break;
    }
  }

  return rows;
}

function aggregateMonthlyCommissionRevenue(
  payments: ReleasedPaymentRecord[],
): MonthlyCommissionRevenue[] {
  const rows = createMonthlyCommissionRows();
  const byMonth = new Map(rows.map((row) => [row.monthKey, row]));

  for (const payment of payments) {
    const monthKey = getPaymentMonthKey(payment);
    const row = monthKey ? byMonth.get(monthKey) : null;

    if (!row) {
      continue;
    }

    row.commissionRevenue += toNumber(payment.commission_amount);
    row.paymentCount += 1;
  }

  return rows.map((row) => ({
    ...row,
    commissionRevenue: normalizeMoney(row.commissionRevenue),
  }));
}

function aggregateRevenueBreakdown(
  payments: ReleasedPaymentRecord[],
  type: "category" | "district",
): RevenueBreakdownItem[] {
  const byBreakdown = new Map<string, RevenueBreakdownItem>();

  for (const payment of payments) {
    const request = getRequest(payment.service_requests);
    const id =
      type === "district"
        ? request?.district_id ?? UNKNOWN_DISTRICT_ID
        : request?.category_id ?? UNKNOWN_CATEGORY_ID;
    const label =
      type === "district"
        ? getRelationName(request?.districts ?? null)
        : getRelationName(request?.service_categories ?? null);
    const current =
      byBreakdown.get(id) ??
      ({
        commissionRevenue: 0,
        gmv: 0,
        id,
        label,
        paymentCount: 0,
      } satisfies RevenueBreakdownItem);

    current.commissionRevenue += toNumber(payment.commission_amount);
    current.gmv += getPaymentGmv(payment);
    current.paymentCount += 1;
    byBreakdown.set(id, current);
  }

  return Array.from(byBreakdown.values())
    .map((item) => ({
      ...item,
      commissionRevenue: normalizeMoney(item.commissionRevenue),
      gmv: normalizeMoney(item.gmv),
    }))
    .sort(
      (a, b) =>
        b.commissionRevenue - a.commissionRevenue ||
        b.paymentCount - a.paymentCount ||
        a.label.localeCompare(b.label, "tr"),
    );
}

function aggregateGmvVsCommission(payments: ReleasedPaymentRecord[]): GmvVsCommissionItem[] {
  const rows = createGmvVsCommissionRows();
  const byMonth = new Map(rows.map((row) => [row.monthKey, row]));

  for (const payment of payments) {
    const monthKey = getPaymentMonthKey(payment);
    const row = monthKey ? byMonth.get(monthKey) : null;

    if (!row) {
      continue;
    }

    row.commissionRevenue += toNumber(payment.commission_amount);
    row.gmv += getPaymentGmv(payment);
    row.paymentCount += 1;
  }

  return rows.map((row) => {
    const gmv = normalizeMoney(row.gmv);
    const commissionRevenue = normalizeMoney(row.commissionRevenue);

    return {
      ...row,
      commissionRate: gmv > 0 ? normalizePercent((commissionRevenue / gmv) * 100) : 0,
      commissionRevenue,
      gmv,
    };
  });
}

export async function getMonthlyCommissionRevenue(
  supabase: AdminSupabaseClient,
): Promise<MonthlyCommissionRevenue[]> {
  try {
    return aggregateMonthlyCommissionRevenue(await queryReleasedRevenuePayments(supabase));
  } catch (error) {
    handleServiceError(error, { logContext: "getMonthlyCommissionRevenue" });
    return createMonthlyCommissionRows();
  }
}

export async function getRevenueByDistrict(
  supabase: AdminSupabaseClient,
): Promise<RevenueBreakdownItem[]> {
  try {
    return aggregateRevenueBreakdown(await queryReleasedRevenuePayments(supabase), "district");
  } catch (error) {
    handleServiceError(error, { logContext: "getRevenueByDistrict" });
    return [];
  }
}

export async function getRevenueByCategory(
  supabase: AdminSupabaseClient,
): Promise<RevenueBreakdownItem[]> {
  try {
    return aggregateRevenueBreakdown(await queryReleasedRevenuePayments(supabase), "category");
  } catch (error) {
    handleServiceError(error, { logContext: "getRevenueByCategory" });
    return [];
  }
}

export async function getGmvVsCommission(
  supabase: AdminSupabaseClient,
): Promise<GmvVsCommissionItem[]> {
  try {
    return aggregateGmvVsCommission(await queryReleasedRevenuePayments(supabase));
  } catch (error) {
    handleServiceError(error, { logContext: "getGmvVsCommission" });
    return createGmvVsCommissionRows();
  }
}

export async function getSupplyDemandGap(
  supabase: AdminSupabaseClient,
): Promise<SupplyDemandGapItem[]> {
  try {
    return querySupplyDemandGap(supabase);
  } catch (error) {
    handleServiceError(error, { logContext: "getSupplyDemandGap" });
    return [];
  }
}

export async function getAdminRevenueDashboard(): Promise<AdminRevenueDashboardData> {
  const gate = await adminGate();
  const emptyMonthlyCommission = createMonthlyCommissionRows();

  if (!gate.ok || !gate.supabase) {
    return {
      error: gate.isConfigured ? "Bu alana erişim yetkin yok." : "Supabase bağlı değil.",
      gmvVsCommission: createGmvVsCommissionRows(),
      isConfigured: gate.isConfigured,
      monthlyCommission: emptyMonthlyCommission,
      revenueByCategory: [],
      revenueByDistrict: [],
      supplyDemandGap: [],
    };
  }

  try {
    const [releasedPayments, supplyDemandGap] = await Promise.all([
      queryReleasedRevenuePayments(gate.supabase),
      querySupplyDemandGap(gate.supabase),
    ]);

    return {
      error: null,
      gmvVsCommission: aggregateGmvVsCommission(releasedPayments),
      isConfigured: true,
      monthlyCommission: aggregateMonthlyCommissionRevenue(releasedPayments),
      revenueByCategory: aggregateRevenueBreakdown(releasedPayments, "category"),
      revenueByDistrict: aggregateRevenueBreakdown(releasedPayments, "district"),
      supplyDemandGap,
    };
  } catch (error) {
    handleServiceError(error, { logContext: "getAdminRevenueDashboard" });

    return {
      error: "Gelir ve büyüme verileri okunamadı.",
      gmvVsCommission: createGmvVsCommissionRows(),
      isConfigured: true,
      monthlyCommission: emptyMonthlyCommission,
      revenueByCategory: [],
      revenueByDistrict: [],
      supplyDemandGap: [],
    };
  }
}
