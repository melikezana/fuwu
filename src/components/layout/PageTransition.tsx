import type { ReactNode } from "react";

type PageTransitionProps = { children: ReactNode; className?: string };

// Route changes should not animate the whole viewport or move sticky app controls.
export function PageTransition({ children, className }: PageTransitionProps) {
  return <div className={className}>{children}</div>;
}
