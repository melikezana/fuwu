import Link from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type TextLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  children: ReactNode;
  href: string;
};

export function TextLink({ children, className, href, ...props }: TextLinkProps) {
  const textLinkClassName = cn(
    "font-medium text-[var(--brand-orange-dark)] underline-offset-4 transition-colors hover:text-[var(--brand-navy)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2",
    className,
  );
  const isExternalHref = /^(?:https?:|tel:|mailto:)/.test(href);

  if (isExternalHref) {
    return (
      <a className={textLinkClassName} href={href} {...props}>
        {children}
      </a>
    );
  }

  return (
    <Link className={textLinkClassName} href={href} {...props}>
      {children}
    </Link>
  );
}
