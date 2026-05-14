"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, Phone, UserSearch } from "lucide-react";
import type { KeyboardEvent, MouseEvent } from "react";
import { appRoutes } from "@/lib/constants/navigation";
import {
  getProviderDataNotice,
  getProviderPhoneHref,
  getProviderProfileBadge,
  getProviderWhatsAppHref,
} from "@/lib/constants/providers";
import { cn } from "@/lib/utils";
import type { Provider } from "@/types/provider";

type ProviderCardProps = {
  provider: Provider;
  actionsId?: string;
  className?: string;
};

const secondaryActionClassName =
  "inline-flex min-h-11 max-w-full cursor-pointer select-none items-center justify-center gap-2 rounded-md bg-white px-3 py-2.5 text-center text-sm font-black leading-5 text-[var(--brand-navy)] shadow-[inset_0_0_0_1px_rgba(13,20,36,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--surface-soft)] hover:shadow-[inset_0_0_0_1px_rgba(13,20,36,0.18)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2 sm:px-4";

const primaryActionClassName =
  "inline-flex min-h-11 max-w-full cursor-pointer select-none items-center justify-center gap-2 rounded-md bg-[var(--brand-orange)] px-3 py-2.5 text-center text-sm font-black leading-5 text-white shadow-[0_12px_26px_rgba(255,138,0,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--brand-orange-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2 sm:px-4";

function formatAveragePrice(price: string) {
  return price.replace(/\s+-\s+/, " – ");
}

function isInteractiveElement(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest("a, button, input, select, textarea, label"));
}

export function ProviderCard({ provider, actionsId, className }: ProviderCardProps) {
  const router = useRouter();
  const profileHref = `${appRoutes.providers}/${provider.id}`;

  function openProfile() {
    router.push(profileHref);
  }

  function handleCardClick(event: MouseEvent<HTMLElement>) {
    if (!isInteractiveElement(event.target)) {
      openProfile();
    }
  }

  function handleCardKeyDown(event: KeyboardEvent<HTMLElement>) {
    if ((event.key === "Enter" || event.key === " ") && !isInteractiveElement(event.target)) {
      event.preventDefault();
      openProfile();
    }
  }

  return (
    <article
      aria-label={`${provider.name} profilini incele`}
      className={cn(
        "flex h-full min-w-0 cursor-pointer flex-col rounded-lg bg-white p-5 shadow-[0_18px_48px_rgba(13,20,36,0.07)] ring-1 ring-[rgba(13,20,36,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_64px_rgba(13,20,36,0.1)] hover:ring-[rgba(255,138,0,0.34)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2 sm:p-6",
        className,
      )}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      role="link"
      tabIndex={0}
    >
      <header className="select-none">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Link
              className="block cursor-pointer break-words text-2xl font-black leading-tight text-[var(--brand-navy)] transition-colors hover:text-[var(--brand-orange-dark)]"
              href={profileHref}
            >
              {provider.name}
            </Link>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                className="max-w-full cursor-pointer rounded-md bg-[var(--brand-orange-soft)] px-3 py-1 text-xs font-black leading-5 text-[var(--brand-orange-dark)] transition-colors hover:bg-[#FFE3BC]"
                href={`${appRoutes.providers}?category=${encodeURIComponent(provider.category)}`}
              >
                {provider.category}
              </Link>
              <Link
                className="max-w-full cursor-pointer rounded-md bg-[var(--surface-soft)] px-3 py-1 text-xs font-black leading-5 text-[var(--brand-navy)] transition-colors hover:bg-[#E5E7EB]"
                href={`${appRoutes.providers}?district=${encodeURIComponent(provider.district)}`}
              >
                {provider.district}
              </Link>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <span className="max-w-full rounded-md bg-[var(--surface-soft)] px-3 py-1.5 text-xs font-black leading-5 text-[var(--muted)]">
              {getProviderProfileBadge(provider)}
            </span>
            <span className="max-w-full rounded-md bg-[#ECFDF5] px-3 py-1.5 text-xs font-black leading-5 text-[var(--trust-green)]">
              {provider.availability}
            </span>
          </div>
        </div>
        <p className="mt-4 text-sm font-semibold leading-6 text-[var(--muted)]">
          {provider.shortDescription}
        </p>
        <p className="mt-3 rounded-md bg-[var(--surface-soft)] px-3 py-2 text-xs font-bold leading-5 text-[var(--muted)]">
          {getProviderDataNotice(provider)}
        </p>
      </header>

      <dl className="mt-5 grid gap-3 border-y border-[var(--border)] py-4">
        <div className="grid gap-1 text-sm sm:grid-cols-[112px_minmax(0,1fr)] sm:items-center sm:gap-3">
          <dt className="select-none font-black text-[var(--muted)]">Puan</dt>
          <dd className="min-w-0 font-black text-[var(--brand-navy)]">
            {provider.rating.toFixed(1)} / {provider.reviewCount} yorum
          </dd>
        </div>
        <div className="grid gap-1 text-sm sm:grid-cols-[112px_minmax(0,1fr)] sm:items-center sm:gap-3">
          <dt className="select-none font-black text-[var(--muted)]">Deneyim</dt>
          <dd className="min-w-0 font-black text-[var(--brand-navy)]">{provider.experience}</dd>
        </div>
        <div className="grid gap-1 text-sm sm:grid-cols-[112px_minmax(0,1fr)] sm:items-center sm:gap-3">
          <dt className="select-none font-black text-[var(--muted)]">Fiyat</dt>
          <dd className="min-w-0 font-black text-[var(--brand-navy)]">
            {formatAveragePrice(provider.averagePrice)}
          </dd>
        </div>
        <div className="grid gap-1 text-sm sm:grid-cols-[112px_minmax(0,1fr)] sm:items-center sm:gap-3">
          <dt className="select-none font-black text-[var(--muted)]">Telefon</dt>
          <dd className="min-w-0 font-black text-[var(--brand-navy)]">{provider.phone}</dd>
        </div>
      </dl>

      <p className="mt-5 max-w-full select-none rounded-md bg-[var(--surface-soft)] px-3 py-1.5 text-sm font-black leading-6 text-[var(--brand-navy)] sm:w-fit">
        {provider.responseTime}
      </p>

      <footer className="mt-auto pt-5">
        <div className="grid gap-2 sm:grid-cols-2" id={actionsId}>
          <a
            aria-label={`${provider.name} WhatsApp ile yaz`}
            className={primaryActionClassName}
            href={getProviderWhatsAppHref(provider)}
            rel="noopener noreferrer"
            target="_blank"
          >
            <MessageCircle aria-hidden="true" className="size-4 shrink-0" />
            WhatsApp
          </a>
          <a
            aria-label={`${provider.name} telefonla ara`}
            className={secondaryActionClassName}
            href={getProviderPhoneHref(provider)}
          >
            <Phone aria-hidden="true" className="size-4 shrink-0" />
            Telefon
          </a>
          <Link
            aria-label={`${provider.name} profilini incele`}
            className={`${secondaryActionClassName} sm:col-span-2`}
            href={profileHref}
          >
            <UserSearch aria-hidden="true" className="size-4 shrink-0" />
            Profili İncele
          </Link>
        </div>
      </footer>
    </article>
  );
}
