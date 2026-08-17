import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  RequestChatThread,
  type RequestChatThreadProps,
} from "./RequestChatThread";

const openThreadArgs = {
  collapsible: false,
  defaultOpen: true,
  initialUnreadCount: 1,
  isEnabled: true,
  requestId: "11111111-1111-4111-8111-111111111111",
  senderRole: "customer",
  title: "Talep yazismasi",
} satisfies RequestChatThreadProps;

const meta = {
  args: openThreadArgs,
  component: RequestChatThread,
  parameters: {
    layout: "centered",
  },
  title: "Messaging/RequestChatThread",
} satisfies Meta<typeof RequestChatThread>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CustomerOpen = {
  args: openThreadArgs,
} satisfies Story;

export const ProviderCollapsed = {
  args: {
    ...openThreadArgs,
    buttonLabel: "Musteri ile yazis",
    collapsible: true,
    defaultOpen: false,
    initialUnreadCount: 3,
    senderRole: "provider",
    title: "Musteri yazismasi",
  } satisfies RequestChatThreadProps,
} satisfies Story;

export const Disabled = {
  args: {
    ...openThreadArgs,
    disabledReason: "Usta talebi kabul ettikten sonra yazisma acilir.",
    isEnabled: false,
    title: "Yazisma kapali",
  } satisfies RequestChatThreadProps,
} satisfies Story;
