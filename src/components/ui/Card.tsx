import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg bg-[var(--surface)] p-5 shadow-[var(--shadow-elevated)] ring-1 ring-[rgba(13,20,36,0.08)] sm:p-6",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
