import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "light";

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
    "bg-[var(--brand-orange)] text-white shadow-[0_14px_30px_rgba(255,138,0,0.24)] hover:-translate-y-0.5 hover:bg-[var(--brand-orange-dark)] hover:shadow-[0_18px_40px_rgba(255,138,0,0.3)]",
  secondary:
    "bg-white text-[var(--brand-navy)] shadow-[inset_0_0_0_2px_rgba(255,138,0,0.56),0_12px_28px_rgba(13,20,36,0.08)] hover:-translate-y-0.5 hover:bg-[var(--brand-orange-soft)] hover:shadow-[inset_0_0_0_2px_rgba(255,138,0,0.88),0_18px_38px_rgba(255,138,0,0.18)]",
  ghost:
    "text-[var(--muted)] hover:bg-[var(--brand-orange-soft)] hover:text-[var(--brand-navy)]",
  light:
    "bg-white text-[var(--brand-navy)] shadow-[0_14px_32px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.88)] hover:-translate-y-0.5 hover:bg-[var(--brand-orange-soft)]",
};

export function Button({
  children,
  className,
  variant = "primary",
  ...props
}: ButtonProps) {
  const buttonClassName = cn(
    "inline-flex min-h-11 max-w-full cursor-pointer select-none items-center justify-center rounded-md px-4 py-2.5 text-center text-sm font-bold leading-5 transition-all duration-200 active:translate-y-px focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 sm:px-5",
    variantClasses[variant],
    className,
  );

  if (typeof props.href === "string") {
    const { href, ...linkProps } = props;

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
