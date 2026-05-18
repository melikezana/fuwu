"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { trackPageView } from "@/services/analytics";

export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    trackPageView({
      path: pathname || "/",
      title: document.title,
    });
  }, [pathname]);

  return null;
}
