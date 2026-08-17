import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MetricCard, type MetricCardProps } from "./MetricCard";

const meta = {
  args: {
    label: "Bekleyen Talep",
    subtext: "Son 24 saat",
    value: 18,
  },
  component: MetricCard,
  parameters: {
    layout: "centered",
  },
  title: "Admin/MetricCard",
} satisfies Meta<typeof MetricCard>;

export default meta;

type Story = StoryObj<typeof meta>;

const requestVolumeArgs = {
  label: "Toplam Talep",
  subtext: "Bu ay",
  value: 248,
} satisfies MetricCardProps;

const revenueArgs = {
  label: "Onayli Ciro",
  subtext: "TRY",
  value: "42.500 TL",
} satisfies MetricCardProps;

export const RequestVolume = {
  args: requestVolumeArgs,
} satisfies Story;

export const Revenue = {
  args: revenueArgs,
} satisfies Story;

export const DashboardSet = {
  render: () => (
    <div className="grid w-[min(48rem,calc(100vw-2rem))] grid-cols-1 gap-3 sm:grid-cols-3">
      <MetricCard label="Bekleyen Talep" subtext="Operasyon sirasinda" value={18} />
      <MetricCard label="Aktif Usta" subtext="Onayli profiller" value={64} />
      <MetricCard label="SLA Asan Acil" subtext="Mudahale gerekli" value={3} />
    </div>
  ),
} satisfies Story;
