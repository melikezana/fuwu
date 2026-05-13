import Link from "next/link";
import type { ReactNode } from "react";
import { Home, LockKeyhole, LogIn, ShieldAlert } from "lucide-react";
import { appRoutes } from "@/constants/navigation";
import type { AdminAccessResult } from "@/services/admin";

type AdminAccessGateProps = {
  access: AdminAccessResult;
  children?: ReactNode;
};

export function AdminAccessGate({ access, children }: AdminAccessGateProps) {
  if (access.ok) {
    return <>{children}</>;
  }

  const isMissingSession = access.reason === "missing-session";
  const primaryHref = isMissingSession
    ? `${appRoutes.login}?next=/admin`
    : appRoutes.home;
  const PrimaryIcon = isMissingSession ? LogIn : Home;

  return (
    <div className="min-h-[70vh] bg-[var(--surface-soft)] px-4 py-12 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-xl rounded-lg border border-[var(--border)] bg-white p-6 shadow-[0_22px_70px_rgba(13,20,36,0.1)] sm:p-8">
        <div className="flex items-start gap-4">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]">
            <ShieldAlert className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <p className="text-xs font-black uppercase text-[var(--brand-orange-dark)]">
              Yetkili admin alanı
            </p>
            <h1 className="mt-2 text-2xl font-black leading-tight text-[var(--brand-navy)] sm:text-3xl">
              Admin paneline erişim
            </h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-[var(--muted)]">
              Bu alan yalnızca Fuwu operasyon ekibindeki admin rolüne sahip
              hesaplar içindir.
            </p>
          </div>
        </div>

        <div
          className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-red-700"
          role="alert"
        >
          <div className="flex gap-3">
            <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <p className="text-sm font-black leading-6">{access.message}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[var(--brand-navy)] px-4 py-3 text-sm font-black text-white transition-colors hover:bg-[var(--brand-navy-soft)]"
            href={primaryHref}
          >
            <PrimaryIcon className="h-4 w-4" aria-hidden />
            {isMissingSession ? "Giriş yap" : "Ana sayfaya dön"}
          </Link>
          <Link
            className="inline-flex min-h-12 items-center justify-center rounded-md border border-[var(--border)] bg-white px-4 py-3 text-sm font-black text-[var(--brand-navy)] transition-colors hover:bg-[var(--surface-soft)]"
            href={appRoutes.providers}
          >
            Ustaları incele
          </Link>
        </div>
      </section>
    </div>
  );
}
