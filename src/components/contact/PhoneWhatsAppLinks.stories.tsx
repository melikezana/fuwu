import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  PhoneWhatsAppLinks,
  type PhoneWhatsAppLinksProps,
} from "./PhoneWhatsAppLinks";

const meta = {
  args: {
    phone: "+90 555 123 45 67",
    whatsappMessage: "Merhaba, Fuwu talebim hakkinda yaziyorum.",
  },
  component: PhoneWhatsAppLinks,
  parameters: {
    layout: "centered",
  },
  title: "Contact/PhoneWhatsAppLinks",
} satisfies Meta<typeof PhoneWhatsAppLinks>;

export default meta;

type Story = StoryObj<typeof meta>;

const defaultArgs = {
  phone: "+90 555 123 45 67",
  whatsappMessage: "Merhaba, Fuwu talebim hakkinda yaziyorum.",
} satisfies PhoneWhatsAppLinksProps;

const compactArgs = {
  className: "rounded-md bg-[var(--surface-soft)] px-3 py-2 text-sm",
  iconClassName: "size-8",
  phone: "0555 123 45 67",
  phoneClassName: "text-[var(--brand-navy)]",
  whatsappAriaLabel: "Ustaya WhatsApp mesaji gonder",
  whatsappMessage: "Merhaba, randevu saati icin teyit almak istiyorum.",
} satisfies PhoneWhatsAppLinksProps;

export const Default = {
  args: defaultArgs,
} satisfies Story;

export const CompactAdminCell = {
  args: compactArgs,
} satisfies Story;

export const MissingPhone = {
  args: {
    ...defaultArgs,
    phone: null,
  } satisfies PhoneWhatsAppLinksProps,
} satisfies Story;
