import { MessageCircle } from "lucide-react";
import {
  createTelHref,
  createWhatsAppDeepLink,
} from "@/lib/contact-links";
import { cn } from "@/lib/utils";

export type PhoneWhatsAppLinksProps = {
  className?: string;
  iconClassName?: string;
  phone: string | null | undefined;
  phoneClassName?: string;
  whatsappAriaLabel?: string;
  whatsappMessage: string;
};

export function PhoneWhatsAppLinks({
  className,
  iconClassName,
  phone,
  phoneClassName,
  whatsappAriaLabel = "WhatsApp üzerinden yaz",
  whatsappMessage,
}: PhoneWhatsAppLinksProps) {
  const displayPhone = phone?.trim();

  if (!displayPhone) {
    return null;
  }

  const telHref = createTelHref(displayPhone);
  const whatsappHref = createWhatsAppDeepLink({
    message: whatsappMessage,
    phone: displayPhone,
  });

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      {telHref ? (
        <a
          className={cn(
            "min-w-0 break-all font-semibold text-[var(--brand-orange-dark)] underline-offset-2 transition hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2",
            phoneClassName,
          )}
          href={telHref}
        >
          {displayPhone}
        </a>
      ) : (
        <span className={cn("min-w-0 break-all", phoneClassName)}>
          {displayPhone}
        </span>
      )}
      {whatsappHref ? (
        <a
          aria-label={whatsappAriaLabel}
          className={cn(
            "inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-[rgba(23,116,95,0.24)] bg-[var(--trust-green-soft)] text-[var(--trust-green)] transition hover:bg-[rgba(23,116,95,0.15)] focus:outline-none focus:ring-2 focus:ring-[var(--trust-green)] focus:ring-offset-2",
            iconClassName,
          )}
          href={whatsappHref}
          rel="noreferrer"
          target="_blank"
        >
          <MessageCircle aria-hidden="true" className="size-3.5" />
        </a>
      ) : null}
    </span>
  );
}
