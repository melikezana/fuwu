import Link from "next/link";
import { FuwuLogo } from "@/components/brand/FuwuLogo";
import { Button } from "@/components/common/Button";
import { Container } from "@/components/common/Container";
import { appRoutes, ctaLabels, navigationLinks } from "@/constants/navigation";

export function Navbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-[rgba(13,20,36,0.08)] bg-white/[0.97] shadow-[0_10px_30px_rgba(13,20,36,0.045)] backdrop-blur-xl">
      <Container className="py-3 lg:py-0">
        <nav className="flex flex-wrap items-center justify-between gap-3 lg:h-[78px] lg:flex-nowrap">
          <Link
            aria-label="Fuwu ana sayfa"
            className="inline-flex min-w-0 cursor-pointer"
            href={appRoutes.home}
          >
            <FuwuLogo size="sm" />
          </Link>

          <div className="hidden items-center gap-1 lg:flex">
            {navigationLinks.map((item) => (
              <Link
                className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-full px-3.5 text-sm font-extrabold text-[var(--muted)] transition-colors hover:bg-[var(--brand-orange-soft)] hover:text-[var(--brand-navy)]"
                href={item.href}
                key={item.id}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            <Button href={appRoutes.login} variant="ghost">
              {ctaLabels.login}
            </Button>
            <Button href={appRoutes.providerApplication} variant="secondary">
              {ctaLabels.provider}
            </Button>
            <Button href={appRoutes.providers}>{ctaLabels.findProvider}</Button>
          </div>

          <div className="grid w-full grid-cols-2 gap-2 border-t border-[var(--border)] pt-3 sm:grid-cols-3 lg:hidden">
            {navigationLinks.map((item) => (
              <Link
                className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-full bg-[var(--surface-soft)] px-3 text-center text-xs font-extrabold text-[var(--brand-navy)] transition-colors hover:bg-[var(--brand-orange-soft)]"
                href={item.href}
                key={item.id}
              >
                {item.label}
              </Link>
            ))}
            <Link
              className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-full bg-white px-3 text-center text-xs font-black text-[var(--brand-navy)] shadow-[inset_0_0_0_1px_rgba(13,20,36,0.12)] transition-colors hover:bg-[var(--surface-soft)]"
              href={appRoutes.login}
            >
              {ctaLabels.login}
            </Link>
            <Link
              className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-full bg-white px-3 text-center text-xs font-black text-[var(--brand-navy)] shadow-[inset_0_0_0_1px_rgba(13,20,36,0.12)] transition-colors hover:bg-[var(--surface-soft)]"
              href={appRoutes.providerApplication}
            >
              {ctaLabels.provider}
            </Link>
            <Link
              className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-full bg-[var(--brand-orange)] px-3 text-center text-xs font-black text-white shadow-[0_12px_26px_rgba(255,138,0,0.22)] transition-colors hover:bg-[var(--brand-orange-dark)]"
              href={appRoutes.providers}
            >
              {ctaLabels.findProvider}
            </Link>
          </div>
        </nav>
      </Container>
    </header>
  );
}
