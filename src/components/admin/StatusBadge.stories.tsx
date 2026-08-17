import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StatusBadge, type StatusBadgeProps } from "./StatusBadge";

const meta = {
  args: {
    status: "Inceleniyor",
    tone: "info",
  },
  argTypes: {
    tone: {
      control: "select",
      options: ["neutral", "success", "warning", "error", "info"],
    },
  },
  component: StatusBadge,
  parameters: {
    layout: "centered",
  },
  title: "Admin/StatusBadge",
} satisfies Meta<typeof StatusBadge>;

export default meta;

type Story = StoryObj<typeof meta>;

const pendingArgs = {
  status: "Yeni talep",
  tone: "info",
} satisfies StatusBadgeProps;

const successArgs = {
  status: "Tamamlandi",
  tone: "success",
} satisfies StatusBadgeProps;

const warningArgs = {
  status: "Usta yaniti bekleniyor",
  tone: "warning",
} satisfies StatusBadgeProps;

const errorArgs = {
  status: "SLA asildi",
  tone: "error",
} satisfies StatusBadgeProps;

export const Info = {
  args: pendingArgs,
} satisfies Story;

export const Success = {
  args: successArgs,
} satisfies Story;

export const Warning = {
  args: warningArgs,
} satisfies Story;

export const Error = {
  args: errorArgs,
} satisfies Story;

export const ToneSet = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusBadge status="Yeni" tone="info" />
      <StatusBadge status="Atandi" tone="warning" />
      <StatusBadge status="Tamamlandi" tone="success" />
      <StatusBadge status="Iptal" tone="error" />
      <StatusBadge status="Arsiv" tone="neutral" />
    </div>
  ),
} satisfies Story;
