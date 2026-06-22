import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "light"
  | "premium"
  | "plain";

type BaseButtonProps = {
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
};

type NativeButtonProps = BaseButtonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: never;
  };

type LinkButtonProps = BaseButtonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "href"> & {
    href: string;
  };

type ButtonProps = NativeButtonProps | LinkButtonProps;

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--brand-orange)] text-white shadow-[var(--shadow-action)] hover:-translate-y-0.5 hover:bg-[var(--brand-orange-dark)] hover:shadow-[var(--shadow-action)]",
  secondary:
    "bg-white text-[var(--brand-navy)] shadow-[var(--shadow-card)] ring-2 ring-[rgba(255,138,0,0.56)] hover:-translate-y-0.5 hover:bg-[var(--brand-orange-soft)] hover:shadow-[var(--shadow-elevated)] hover:ring-[rgba(255,138,0,0.88)]",
  ghost:
    "text-[var(--muted)] hover:bg-[var(--brand-orange-soft)] hover:text-[var(--brand-navy)]",
  light:
    "bg-white text-[var(--brand-navy)] shadow-[var(--shadow-card)] hover:-translate-y-0.5 hover:bg-[var(--brand-orange-soft)] hover:shadow-[var(--shadow-elevated)]",
  premium:
    "bg-[var(--brand-orange)] text-white shadow-[var(--shadow-action)] ring-1 ring-[rgba(255,138,0,0.42)] hover:-translate-y-0.5 hover:bg-[var(--brand-orange-dark)] hover:shadow-[var(--shadow-action)]",
  plain: "",
};

export function Button({
  children,
  className,
  variant = "primary",
  ...props
}: ButtonProps) {
  const buttonClassName = cn(
    variant === "plain"
      ? ""
      : "inline-flex min-h-11 max-w-full cursor-pointer select-none items-center justify-center rounded-md px-4 py-2.5 text-center text-sm font-semibold leading-5 transition-all duration-200 active:scale-[0.98] active:translate-y-px focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 sm:px-5",
    variantClasses[variant],
    className,
  );

  if (typeof props.href === "string") {
    const { href, ...linkProps } = props;
    const isExternalHref = /^(?:https?:|tel:|mailto:)/.test(href);

    if (isExternalHref) {
      return (
        <a className={buttonClassName} href={href} {...linkProps}>
          {children}
        </a>
      );
    }

    return (
      <Link className={buttonClassName} href={href} {...linkProps}>
        {children}
      </Link>
    );
  }

  return (
    <button className={buttonClassName} {...props}>
      {children}
    </button>
  );
}
