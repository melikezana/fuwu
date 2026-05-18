"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { useEffect } from "react";
import {
  getProviderPhoneHref,
  getProviderWhatsAppHref,
} from "@/lib/constants/providers";
import {
  trackPhoneClick,
  trackProviderDetailOpen,
  trackWhatsappClick,
} from "@/services/analytics";
import type { Provider } from "@/types/provider";

function getProviderAnalyticsPayload(provider: Provider) {
  return {
    category: provider.category,
    district: provider.district,
    providerId: provider.id,
    source: provider.source,
  };
}

export function ProviderProfileViewTracker({ provider }: { provider: Provider }) {
  useEffect(() => {
    trackProviderDetailOpen(getProviderAnalyticsPayload(provider));
  }, [provider]);

  return null;
}

export function ProviderContactLink({
  children,
  kind,
  provider,
  ...linkProps
}: {
  children: ReactNode;
  kind: "phone" | "whatsapp";
  provider: Provider;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "onClick">) {
  const href = kind === "whatsapp" ? getProviderWhatsAppHref(provider) : getProviderPhoneHref(provider);

  return (
    <a
      href={href}
      onClick={() => {
        if (kind === "whatsapp") {
          trackWhatsappClick(getProviderAnalyticsPayload(provider));
          return;
        }

        trackPhoneClick(getProviderAnalyticsPayload(provider));
      }}
      {...linkProps}
    >
      {children}
    </a>
  );
}
