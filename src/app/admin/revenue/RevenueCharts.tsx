"use client";

import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  GmvVsCommissionItem,
  MonthlyCommissionRevenue,
  RevenueBreakdownItem,
  SupplyDemandGapItem,
} from "@/services/admin/revenue";

type RevenueChartsProps = {
  gmvVsCommission: GmvVsCommissionItem[];
  monthlyCommission: MonthlyCommissionRevenue[];
  revenueByCategory: RevenueBreakdownItem[];
  revenueByDistrict: RevenueBreakdownItem[];
  supplyDemandGap: SupplyDemandGapItem[];
};

const currency = new Intl.NumberFormat("tr-TR", {
  currency: "TRY",
  maximumFractionDigits: 0,
  style: "currency",
});

const compactNumber = new Intl.NumberFormat("tr-TR", {
  maximumFractionDigits: 1,
  notation: "compact",
});

function formatCurrency(value: unknown) {
  const amount = Number(value);

  return Number.isFinite(amount) ? currency.format(amount) : "₺0";
}

function formatCount(value: unknown) {
  const count = Number(value);

  return Number.isFinite(count) ? compactNumber.format(count) : "0";
}

function tooltipStyle() {
  return {
    border: "1px solid var(--border)",
    borderRadius: "8px",
    boxShadow: "var(--shadow-card)",
    color: "var(--brand-navy)",
  };
}

function axisTickStyle() {
  return {
    fill: "var(--muted)",
    fontSize: 12,
    fontWeight: 600,
  };
}

function ChartFrame({
  children,
  subtitle,
  title,
}: {
  children: ReactNode;
  subtitle?: string;
  title: string;
}) {
  return (
    <figure className="rounded-lg border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-subtle)]">
      <figcaption className="mb-4">
        <p className="text-sm font-bold text-[var(--brand-navy)]">{title}</p>
        {subtitle ? (
          <p className="mt-1 text-xs font-semibold leading-5 text-[var(--muted)]">
            {subtitle}
          </p>
        ) : null}
      </figcaption>
      <div className="h-72 min-w-[280px]">{children}</div>
    </figure>
  );
}

function RevenueBreakdownChart({
  data,
  title,
}: {
  data: RevenueBreakdownItem[];
  title: string;
}) {
  const chartData = data.slice(0, 8).map((item) => ({
    label: item.label,
    revenue: item.commissionRevenue,
  }));

  return (
    <ChartFrame subtitle="İlk 8 kırılım" title={title}>
      <ResponsiveContainer height="100%" width="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ bottom: 8, left: 8, right: 24, top: 8 }}
        >
          <CartesianGrid horizontal={false} stroke="var(--border)" />
          <XAxis
            tick={axisTickStyle()}
            tickFormatter={formatCount}
            type="number"
          />
          <YAxis
            dataKey="label"
            tick={axisTickStyle()}
            tickLine={false}
            type="category"
            width={112}
          />
          <Tooltip
            contentStyle={tooltipStyle()}
            formatter={(value) => [formatCurrency(value), "Komisyon"]}
          />
          <Bar
            dataKey="revenue"
            fill="var(--brand-orange)"
            name="Komisyon"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function RevenueCharts({
  gmvVsCommission,
  monthlyCommission,
  revenueByCategory,
  revenueByDistrict,
  supplyDemandGap,
}: RevenueChartsProps) {
  const gapData = supplyDemandGap.slice(0, 10).map((item) => ({
    district: item.district,
    providers: item.activeApprovedProviderCount,
    requests: item.openDemandCount,
  }));

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <ChartFrame
          subtitle="Escrow serbest bırakılan ödemelerde komisyon toplamı"
          title="Aylık Komisyon Geliri"
        >
          <ResponsiveContainer height="100%" width="100%">
            <BarChart
              data={monthlyCommission}
              margin={{ bottom: 8, left: 8, right: 18, top: 8 }}
            >
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={axisTickStyle()}
                tickLine={false}
              />
              <YAxis tick={axisTickStyle()} tickFormatter={formatCount} />
              <Tooltip
                contentStyle={tooltipStyle()}
                formatter={(value) => [formatCurrency(value), "Komisyon"]}
              />
              <Bar
                dataKey="commissionRevenue"
                fill="var(--brand-orange)"
                name="Komisyon"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>

        <ChartFrame
          subtitle="GMV ve komisyon aynı ay içinde karşılaştırılır"
          title="GMV / Komisyon"
        >
          <ResponsiveContainer height="100%" width="100%">
            <ComposedChart
              data={gmvVsCommission}
              margin={{ bottom: 8, left: 8, right: 18, top: 8 }}
            >
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={axisTickStyle()} tickLine={false} />
              <YAxis tick={axisTickStyle()} tickFormatter={formatCount} />
              <Tooltip
                contentStyle={tooltipStyle()}
                formatter={(value, name) => [
                  formatCurrency(value),
                  name === "gmv" ? "GMV" : "Komisyon",
                ]}
              />
              <Legend />
              <Bar
                dataKey="gmv"
                fill="var(--brand-navy)"
                name="GMV"
                radius={[4, 4, 0, 0]}
              />
              <Line
                dataKey="commissionRevenue"
                dot={{ fill: "var(--brand-orange)", r: 3 }}
                name="Komisyon"
                stroke="var(--brand-orange)"
                strokeWidth={3}
                type="monotone"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartFrame>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <RevenueBreakdownChart data={revenueByDistrict} title="İlçeye Göre Gelir" />
        <RevenueBreakdownChart data={revenueByCategory} title="Kategoriye Göre Gelir" />
      </div>

      <ChartFrame
        subtitle="Bekleyen/açık talep ile aktif ve onaylı usta kapasitesi"
        title="Arz / Talep Açığı"
      >
        <ResponsiveContainer height="100%" width="100%">
          <BarChart data={gapData} margin={{ bottom: 8, left: 8, right: 18, top: 8 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="district" tick={axisTickStyle()} tickLine={false} />
            <YAxis allowDecimals={false} tick={axisTickStyle()} />
            <Tooltip
              contentStyle={tooltipStyle()}
              formatter={(value, name) => [
                formatCount(value),
                name === "requests" ? "Açık talep" : "Aktif usta",
              ]}
            />
            <Legend />
            <Bar
              dataKey="requests"
              fill="var(--brand-orange)"
              name="Açık talep"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="providers"
              fill="var(--brand-navy)"
              name="Aktif usta"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
    </div>
  );
}
