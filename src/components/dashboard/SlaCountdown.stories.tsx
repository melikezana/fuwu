import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SlaCountdown, type SlaCountdownProps } from "./SlaCountdown";

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

const normalArgs = {
  assignedAt: minutesAgo(2),
} satisfies SlaCountdownProps;

const breachedArgs = {
  assignedAt: minutesAgo(10),
} satisfies SlaCountdownProps;

const meta = {
  args: normalArgs,
  component: SlaCountdown,
  parameters: {
    layout: "centered",
  },
  title: "Dashboard/SlaCountdown",
} satisfies Meta<typeof SlaCountdown>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Normal = {
  args: normalArgs,
} satisfies Story;

export const Breached = {
  args: breachedArgs,
} satisfies Story;

export const States = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <SlaCountdown assignedAt={minutesAgo(1)} />
      <SlaCountdown assignedAt={minutesAgo(4)} />
      <SlaCountdown assignedAt={minutesAgo(8)} />
    </div>
  ),
} satisfies Story;
