"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { useEffect } from "react";
import { Button, type ButtonVariant } from "@/components/ui/Button";
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
  variant,
  ...linkProps
}: {
  children: ReactNode;
  kind: "phone" | "whatsapp";
  provider: Provider;
  variant?: ButtonVariant;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "onClick">) {
  const href = kind === "whatsapp" ? getProviderWhatsAppHref(provider) : getProviderPhoneHref(provider);

  if (!href) {
    return null;
  }

  return (
    <Button
      href={href}
      onClick={() => {
        if (kind === "whatsapp") {
          trackWhatsappClick(getProviderAnalyticsPayload(provider));
          return;
        }

        trackPhoneClick(getProviderAnalyticsPayload(provider));
      }}
      variant={variant ?? (kind === "whatsapp" ? "premium" : "secondary")}
      {...linkProps}
    >
      {children}
    </Button>
  );
}
