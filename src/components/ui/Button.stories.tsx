import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button, type ButtonProps, type ButtonVariant } from "./Button";

const buttonVariants: ButtonVariant[] = [
  "primary",
  "secondary",
  "ghost",
  "light",
  "premium",
  "plain",
];

const meta = {
  args: {
    children: "Talep Olustur",
    variant: "primary",
  },
  argTypes: {
    variant: {
      control: "select",
      options: buttonVariants,
    },
  },
  component: Button,
  parameters: {
    layout: "centered",
  },
  title: "UI/Button",
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

const primaryArgs = {
  children: "Talep Olustur",
  variant: "primary",
} satisfies ButtonProps;

const secondaryArgs = {
  children: "Usta Bul",
  href: "/providers",
  variant: "secondary",
} satisfies ButtonProps;

const premiumArgs = {
  children: "Online Odeme",
  variant: "premium",
} satisfies ButtonProps;

const disabledArgs = {
  children: "Kaydediliyor",
  disabled: true,
  variant: "primary",
} satisfies ButtonProps;

export const Primary = {
  args: primaryArgs,
} satisfies Story;

export const SecondaryLink = {
  args: secondaryArgs,
} satisfies Story;

export const Premium = {
  args: premiumArgs,
} satisfies Story;

export const Disabled = {
  args: disabledArgs,
} satisfies Story;

export const VariantSet = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      {buttonVariants.map((variant) => (
        <Button key={variant} variant={variant}>
          {variant}
        </Button>
      ))}
    </div>
  ),
} satisfies Story;
